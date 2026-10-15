/**
 * Application error hierarchy.
 *
 * Errors describe *what* went wrong in domain terms; the HTTP layer
 * (src/http/errorResponses.ts) decides which status code each class maps to.
 */
import { ErrorCode } from './ErrorCode';

/** Extra structured information returned to the client in `error.details`. */
export type ErrorDetails = Record<string, unknown>;

/** Base class for every expected (non-bug) error raised by the application. */
export abstract class AppError extends Error {
  protected constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The input is malformed or violates a validation rule (HTTP 400). */
export class ValidationError extends AppError {
  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(code, message, details);
  }
}

/** The caller is not authenticated or the token is invalid (HTTP 401). */
export class AuthenticationError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message);
  }
}

/** The caller is authenticated but not allowed to perform the action (HTTP 403). */
export class ForbiddenError extends AppError {
  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(code, message, details);
  }
}

/** The resource does not exist, or the caller is not allowed to know it exists (HTTP 404). */
export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message);
  }
}

/** The route exists, but not for this HTTP method (HTTP 405). */
export class MethodNotAllowedError extends AppError {
  constructor(
    method: string,
    readonly allowedMethods: string[],
  ) {
    super(ErrorCode.MethodNotAllowed, `Method ${method} is not allowed on this route.`, {
      allowedMethods,
    });
  }
}

/** The action conflicts with the current state of the data (HTTP 409). */
export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(code, message, details);
  }
}
