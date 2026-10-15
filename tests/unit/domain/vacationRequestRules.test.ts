/**
 * Unit tests for the date business rules: date order, future start, overlaps and exact duplicates.
 */
import {
  assertNoSchedulingConflict,
  assertValidVacationPeriod,
  findSchedulingConflict,
} from '../../../src/modules/vacation-requests/domain/vacationRequestRules';
import { VacationRequestStatus } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';
import { ConflictError, ValidationError } from '../../../src/shared/errors/AppError';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import { makeRequest, TODAY } from '../support/fixtures';

describe('assertValidVacationPeriod (rules 1 and 5)', () => {
  it('accepts a vacation starting tomorrow', () => {
    expect(() =>
      assertValidVacationPeriod({ startDate: '2026-10-16', endDate: '2026-10-18' }, TODAY),
    ).not.toThrow();
  });

  it('accepts a one-day vacation', () => {
    expect(() =>
      assertValidVacationPeriod({ startDate: '2026-10-20', endDate: '2026-10-20' }, TODAY),
    ).not.toThrow();
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      assertValidVacationPeriod({ startDate: '2026-10-20', endDate: '2026-10-19' }, TODAY),
    ).toThrow(expect.objectContaining({ code: ErrorCode.InvalidDateRange }));
  });

  it('rejects a vacation starting on the submission day', () => {
    expect(() =>
      assertValidVacationPeriod({ startDate: TODAY, endDate: '2026-10-18' }, TODAY),
    ).toThrow(expect.objectContaining({ code: ErrorCode.StartDateNotInFuture }));
  });

  it('rejects a vacation in the past', () => {
    let error: unknown;
    try {
      assertValidVacationPeriod({ startDate: '2026-09-01', endDate: '2026-09-03' }, TODAY);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ details: { earliestStartDate: '2026-10-16' } });
  });
});

describe('findSchedulingConflict (rules 2 and 3)', () => {
  const period = { startDate: '2026-11-10', endDate: '2026-11-12' };

  it('reports an exact duplicate even if the existing request was rejected', () => {
    const rejected = makeRequest({
      ...period,
      status: VacationRequestStatus.Rejected,
      comments: 'No',
    });
    expect(findSchedulingConflict(period, [rejected])?.code).toBe(
      ErrorCode.DuplicateVacationRequest,
    );
  });

  it.each([VacationRequestStatus.Pending, VacationRequestStatus.Approved])(
    'reports an overlap with a %s request',
    (status) => {
      const existing = makeRequest({ startDate: '2026-11-12', endDate: '2026-11-15', status });
      expect(findSchedulingConflict(period, [existing])?.code).toBe(ErrorCode.VacationOverlap);
    },
  );

  it('ignores overlaps with rejected requests', () => {
    const rejected = makeRequest({
      startDate: '2026-11-11',
      endDate: '2026-11-15',
      status: VacationRequestStatus.Rejected,
      comments: 'No',
    });
    expect(findSchedulingConflict(period, [rejected])).toBeNull();
  });

  it('allows back-to-back vacations', () => {
    const adjacent = makeRequest({ startDate: '2026-11-13', endDate: '2026-11-15' });
    expect(findSchedulingConflict(period, [adjacent])).toBeNull();
  });

  it('throws a ConflictError pointing at the conflicting request', () => {
    const existing = makeRequest({ id: 7, startDate: '2026-11-01', endDate: '2026-11-30' });
    expect(() => assertNoSchedulingConflict(period, [existing])).toThrow(ConflictError);
    expect(() => assertNoSchedulingConflict(period, [existing])).toThrow(
      expect.objectContaining({ details: { conflictingRequestId: 7 } }),
    );
  });
});
