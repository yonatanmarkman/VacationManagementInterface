/**
 * Maps errors to HTTP responses with one consistent body:
 * `{ "error": { "code": "...", "message": "...", "details": { ... } } }`.
 *
 * Unexpected errors are logged with their stack and returned as a generic 500, so
 * internal details never leak to clients.
 */
import {
  AppError,
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  MethodNotAllowedError,
  NotFoundError,
  ValidationError,
} from '../shared/errors/AppError';
import { ErrorCode } from '../shared/errors/ErrorCode';
import { logger } from '../shared/logging/logger';
import { jsonResponse } from './responses';
import type { HttpResponse } from './types';

/** The HTTP status code of each error class. */
export function statusCodeOf(error: AppError): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof MethodNotAllowedError) return 405;
  if (error instanceof ConflictError) return 409;
  return 500;
}

export function toErrorResponse(error: unknown): HttpResponse {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error instanceof AuthenticationError) {
      headers['WWW-Authenticate'] = 'Bearer';
    }
    if (error instanceof MethodNotAllowedError) {
      headers.Allow = error.allowedMethods.join(', ');
    }
    return jsonResponse(
      statusCodeOf(error),
      { error: { code: error.code, message: error.message, details: error.details } },
      headers,
    );
  }

  logger.error('Unhandled error', { error });
  return jsonResponse(500, {
    error: { code: ErrorCode.InternalError, message: 'An unexpected error occurred.' },
  });
}
