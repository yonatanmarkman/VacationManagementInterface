/**
 * Business rules about vacation dates, written as pure functions so they are easy to test.
 *
 * - Rule 1: the end date must not be before the start date (one-day vacations are allowed).
 * - Rule 2: a user's Pending/Approved requests must not overlap.
 * - Rule 3: a user cannot submit the exact same dates twice (in any status).
 * - Rule 5: a vacation must start after the submission day (no past dates, not today).
 *
 * Rules 2 and 3 are also enforced by database constraints, which protect against
 * concurrent submissions that both pass these checks at the same time.
 */
import { ConflictError, ValidationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { DateRange, IsoDate } from '../../../shared/time/calendarDate';
import { addDays, rangesOverlap } from '../../../shared/time/calendarDate';
import type { VacationRequest } from './VacationRequest';
import { ACTIVE_STATUSES } from './VacationRequestStatus';

/** A clash between a requested period and one of the user's existing requests. */
export interface SchedulingConflict {
  readonly code: ErrorCode.DuplicateVacationRequest | ErrorCode.VacationOverlap;
  readonly conflictingRequest: VacationRequest;
}

/** Rules 1 and 5. Throws a ValidationError if the period is not acceptable. */
export function assertValidVacationPeriod(period: DateRange, today: IsoDate): void {
  if (period.endDate < period.startDate) {
    throw new ValidationError(
      ErrorCode.InvalidDateRange,
      'endDate must be on or after startDate.',
      { startDate: period.startDate, endDate: period.endDate },
    );
  }
  if (period.startDate <= today) {
    const earliestStartDate = addDays(today, 1);
    throw new ValidationError(
      ErrorCode.StartDateNotInFuture,
      `Vacations must start after the day they are requested. The earliest possible startDate is ${earliestStartDate}.`,
      { today, earliestStartDate },
    );
  }
}

/**
 * Rules 2 and 3. Looks for a clash between `period` and the same user's existing requests.
 * An exact duplicate is reported before a plain overlap; Rejected requests only count as duplicates.
 */
export function findSchedulingConflict(
  period: DateRange,
  existingRequests: readonly VacationRequest[],
): SchedulingConflict | null {
  const duplicate = existingRequests.find(
    (request) => request.startDate === period.startDate && request.endDate === period.endDate,
  );
  if (duplicate) {
    return { code: ErrorCode.DuplicateVacationRequest, conflictingRequest: duplicate };
  }
  const overlapping = existingRequests.find(
    (request) => ACTIVE_STATUSES.includes(request.status) && rangesOverlap(request.period, period),
  );
  return overlapping ? { code: ErrorCode.VacationOverlap, conflictingRequest: overlapping } : null;
}

/** Human-readable explanation of a conflict. */
export function describeConflict(conflict: SchedulingConflict): string {
  const { startDate, endDate, status } = conflict.conflictingRequest;
  return conflict.code === ErrorCode.DuplicateVacationRequest
    ? `A vacation request for exactly ${startDate} to ${endDate} already exists (status: ${status}).`
    : `These dates overlap with a ${status} vacation request from ${startDate} to ${endDate}.`;
}

/** Rules 2 and 3. Throws a ConflictError if `period` clashes with an existing request. */
export function assertNoSchedulingConflict(
  period: DateRange,
  existingRequests: readonly VacationRequest[],
): void {
  const conflict = findSchedulingConflict(period, existingRequests);
  if (conflict) {
    throw new ConflictError(conflict.code, describeConflict(conflict), {
      conflictingRequestId: conflict.conflictingRequest.id,
    });
  }
}
