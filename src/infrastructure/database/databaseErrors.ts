/**
 * Translates PostgreSQL errors into domain errors.
 *
 * The application checks rules before writing, but two concurrent transactions can both
 * pass those checks. The database constraints then reject the loser, and this function
 * turns that rejection into the same 409 error the application check would have produced.
 */
import { QueryFailedError } from 'typeorm';
import { ConflictError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/ErrorCode';
import { DbConstraint } from './constraints';

/** PostgreSQL SQLSTATE codes we handle. */
const PgErrorCode = {
  UniqueViolation: '23505',
  ExclusionViolation: '23P01',
  SerializationFailure: '40001',
  DeadlockDetected: '40P01',
} as const;

interface PgDriverError {
  code?: string;
  constraint?: string;
}

export function translateDatabaseError(error: unknown): unknown {
  if (!(error instanceof QueryFailedError)) {
    return error;
  }
  const { code, constraint } = error.driverError as PgDriverError;

  if (code === PgErrorCode.ExclusionViolation && constraint === DbConstraint.NoOverlap) {
    return new ConflictError(
      ErrorCode.VacationOverlap,
      'These dates overlap with another Pending or Approved vacation request of the same user.',
    );
  }
  if (code === PgErrorCode.UniqueViolation && constraint === DbConstraint.UniqueUserDates) {
    return new ConflictError(
      ErrorCode.DuplicateVacationRequest,
      'A vacation request for exactly these dates already exists.',
    );
  }
  if (code === PgErrorCode.SerializationFailure || code === PgErrorCode.DeadlockDetected) {
    return new ConflictError(
      ErrorCode.ConcurrentModification,
      'The request conflicted with a concurrent change. Please try again.',
    );
  }
  return error;
}
