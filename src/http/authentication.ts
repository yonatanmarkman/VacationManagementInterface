/**
 * Authentication (who is calling?) and role-based authorization (may they call this route?).
 */
import type { Principal } from '../modules/auth/domain/Principal';
import type { TokenService } from '../modules/auth/domain/ports';
import type { UserRole } from '../modules/users/domain/UserRole';
import { AuthenticationError, ForbiddenError } from '../shared/errors/AppError';
import { ErrorCode } from '../shared/errors/ErrorCode';
import type { CommonEvent, RequestContext } from './types';

/** Reads a header case-insensitively (API Gateway and Node use different casing). */
export function getHeader(event: CommonEvent, name: string): string | undefined {
  const target = name.toLowerCase();
  const entry = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === target);
  return entry?.[1];
}

/** Resolves the caller from the `Authorization: Bearer <token>` header. */
export function authenticate(event: CommonEvent, tokenService: TokenService): Principal {
  const header = getHeader(event, 'authorization');
  if (!header) {
    throw new AuthenticationError(
      ErrorCode.AuthenticationRequired,
      'Authentication required. Send an "Authorization: Bearer <token>" header.',
    );
  }
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    throw new AuthenticationError(
      ErrorCode.InvalidToken,
      'The Authorization header must have the form "Bearer <token>".',
    );
  }
  return tokenService.verify(token);
}

/** Throws 403 unless the caller holds at least one of the allowed roles (empty = any role). */
export function authorize(principal: Principal, allowedRoles: readonly UserRole[]): void {
  if (allowedRoles.length > 0 && !allowedRoles.some((role) => principal.roles.includes(role))) {
    throw new ForbiddenError(
      ErrorCode.Forbidden,
      `This action requires the ${allowedRoles.join(' or ')} role.`,
      { requiredRoles: allowedRoles },
    );
  }
}

/** Returns the authenticated caller in a handler of a protected route. */
export function requirePrincipal(context: RequestContext): Principal {
  if (!context.principal) {
    // Only reachable if a protected handler is mapped to a route declared public in root.yaml.
    throw new AuthenticationError(ErrorCode.AuthenticationRequired, 'Authentication required.');
  }
  return context.principal;
}
