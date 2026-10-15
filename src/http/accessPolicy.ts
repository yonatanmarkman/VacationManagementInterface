/**
 * Reads each route's access rules from root.yaml, which is the single source of truth
 * for routing, documentation and security:
 *
 *   security: [{ bearerAuth: [] }]   # standard OpenAPI: the route needs a valid token
 *   security: []                     # standard OpenAPI: the route is public
 *   x-roles: [Validator]             # extension: the caller needs at least one of these roles
 *
 * Routes inherit the document-level `security` when they do not declare their own.
 * The policy fails closed: declaring roles always implies authentication.
 */
import type { RouteConfig } from 'commoneventframework';
import { getSpec } from 'commoneventframework/dist/doc/swagger';
import { ALL_USER_ROLES, type UserRole } from '../modules/users/domain/UserRole';

export interface AccessPolicy {
  readonly requiresAuthentication: boolean;
  readonly roles: readonly UserRole[];
}

interface OperationSpec {
  security?: unknown[];
  'x-roles'?: unknown[];
}

interface OpenApiSpec {
  security?: unknown[];
  paths?: Record<string, Record<string, OperationSpec | undefined> | undefined>;
}

/** Computes the access policy of an operation of an OpenAPI document. */
export function resolveAccessPolicy(
  spec: OpenApiSpec | null,
  path: string,
  method: string,
): AccessPolicy {
  const operation = spec?.paths?.[path]?.[method.toLowerCase()];
  const security = operation?.security ?? spec?.security;
  const roles = (operation?.['x-roles'] ?? []).map((role) => {
    if (!ALL_USER_ROLES.includes(role as UserRole)) {
      throw new Error(`root.yaml: unknown role "${String(role)}" in x-roles of ${method} ${path}`);
    }
    return role as UserRole;
  });
  // Missing spec or missing `security` => authentication required (fail closed).
  const declaredPublic = Array.isArray(security) && security.length === 0;
  return { requiresAuthentication: !declaredPublic || roles.length > 0, roles };
}

const cache = new Map<string, AccessPolicy>();

/** The access policy of a CEF route, read from the loaded root.yaml (cached). */
export function getAccessPolicy(route: RouteConfig): AccessPolicy {
  const key = `${route.method} ${route.path}`;
  let policy = cache.get(key);
  if (!policy) {
    policy = resolveAccessPolicy(getSpec() as OpenApiSpec | null, route.path, route.method);
    cache.set(key, policy);
  }
  return policy;
}
