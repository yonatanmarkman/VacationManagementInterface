/**
 * The HTTP request pipeline: the Lambda-style handler that CEF's dev server invokes.
 *
 * For every request:
 *   1. CEF normalizes the event into a CommonEvent and matches a route from root.yaml.
 *   2. The route's access policy (root.yaml `security` / `x-roles`) is enforced -> 401 / 403.
 *   3. The route's `x-inputParser` validates the input                          -> 400.
 *   4. The route's `x-handler` dispatches a command or query and builds the response.
 *   5. Any error is converted into the standard error response; nothing escapes.
 *
 * Authentication runs before input parsing, so anonymous callers never learn anything
 * about the expected input of protected routes.
 */
import {
  buildCommonEvent,
  getRouteConfig,
  resolveHandlerRef,
  setLambdaContext,
} from 'commoneventframework';
import type { Context, RouteConfig } from 'commoneventframework';
import type { LambdaEvent } from 'commoneventframework/dist/types/commonEvent';
import { getContainer } from '../bootstrap/container';
import { MethodNotAllowedError, NotFoundError } from '../shared/errors/AppError';
import { ErrorCode } from '../shared/errors/ErrorCode';
import { logger } from '../shared/logging/logger';
import { getAccessPolicy } from './accessPolicy';
import { authenticate, authorize } from './authentication';
import { toErrorResponse } from './errorResponses';
import { noContent } from './responses';
import type { CommonEvent, HttpHandler, HttpResponse, InputParser } from './types';

export type LambdaHandler = (event: LambdaEvent, context: Context) => Promise<HttpResponse>;

export interface PipelineOptions {
  /** Resolves once environment variables are loaded (CEF's loadEnv()). */
  readonly envReady: Promise<void>;
  /** Absolute path of root.yaml. */
  readonly rootYamlPath: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BUILT_IN_HANDLER_PREFIX = '__builtin__/';

export function createHttpPipeline(options: PipelineOptions): LambdaHandler {
  let routesLoaded = false;

  return async (event, context) => {
    const startedAt = performance.now();
    let commonEvent: CommonEvent | undefined;
    let response: HttpResponse;
    try {
      await options.envReady;
      await setLambdaContext(context);
      // Load root.yaml from an explicit path once; CEF caches the routes afterwards.
      commonEvent = buildCommonEvent(event, routesLoaded ? undefined : options.rootYamlPath);
      routesLoaded = true;
      response = await dispatch(commonEvent);
    } catch (error) {
      response = toErrorResponse(error);
    }
    logger.info('http request', {
      method: commonEvent?.method,
      path: commonEvent?.path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };
}

async function dispatch(event: CommonEvent): Promise<HttpResponse> {
  if (event.method === 'OPTIONS') {
    return noContent(); // CORS preflight (the local dev server answers these itself)
  }
  const route = findRoute(event);
  const handler = resolveHandlerRef(route.handler ?? '') as HttpHandler<unknown> | undefined;
  if (!handler) {
    throw new Error(
      `root.yaml: handler "${route.handler}" is not registered (run npm run codegen)`,
    );
  }
  if (route.handler?.startsWith(BUILT_IN_HANDLER_PREFIX)) {
    // CEF built-ins: /doc, /doc/spec, /context, /dependencies (public).
    return (handler as unknown as () => Promise<HttpResponse>)();
  }

  const policy = getAccessPolicy(route);
  let principal = null;
  if (policy.requiresAuthentication) {
    const { tokenService } = await getContainer();
    principal = authenticate(event, tokenService);
    authorize(principal, policy.roles);
  }

  const parser = route.inputParser
    ? (resolveHandlerRef(route.inputParser) as InputParser<unknown> | undefined)
    : undefined;
  if (route.inputParser && !parser) {
    throw new Error(`root.yaml: input parser "${route.inputParser}" is not registered`);
  }
  const input = parser ? parser(event) : undefined;
  return handler(input, { event, principal });
}

/** Finds the route, or explains why there is none (404 unknown path, 405 wrong method). */
function findRoute(event: CommonEvent): RouteConfig {
  const route = getRouteConfig(event);
  if (route?.handler) {
    return route;
  }
  const allowedMethods = HTTP_METHODS.filter(
    (method) => getRouteConfig({ ...event, method }) !== null,
  );
  if (allowedMethods.length > 0) {
    throw new MethodNotAllowedError(event.method, allowedMethods);
  }
  throw new NotFoundError(
    ErrorCode.RouteNotFound,
    `No route matches ${event.method} ${event.path}.`,
  );
}
