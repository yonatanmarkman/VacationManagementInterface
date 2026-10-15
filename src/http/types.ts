/**
 * Types shared by the HTTP layer: the signatures of CEF input parsers and handlers
 * (referenced from root.yaml via `x-inputParser` / `x-handler`).
 */
import type { APIGatewayProxyStructuredResultV2 } from 'commoneventframework';
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent';
import type { Principal } from '../modules/auth/domain/Principal';

export type { CommonEvent };

/** What every handler returns (CEF's Response class implements this shape). */
export type HttpResponse = APIGatewayProxyStructuredResultV2;

/** Per-request information given to handlers by the pipeline. */
export interface RequestContext {
  readonly event: CommonEvent;
  /** The authenticated caller; null only on public routes (see `security` in root.yaml). */
  readonly principal: Principal | null;
}

/** Validates and converts the raw event into a typed input. Throws ValidationError on bad input. */
export type InputParser<TInput> = (event: CommonEvent) => TInput;

/** Executes the use case for a route and builds the HTTP response. */
export type HttpHandler<TInput = void> = (
  input: TInput,
  context: RequestContext,
) => Promise<HttpResponse>;
