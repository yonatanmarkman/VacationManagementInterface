/**
 * Unit tests for the VacationRequest entity: status transitions, self-decision ban, rejection comments
 * and optimistic-locking version checks.
 */
import { VacationRequestStatus } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import { makeRequest } from '../support/fixtures';

const OWNER = 1;
const VALIDATOR = 2;

describe('VacationRequest', () => {
  it('is created as Pending without comments', () => {
    const request = makeRequest();
    expect(request.status).toBe(VacationRequestStatus.Pending);
    expect(request.comments).toBeNull();
  });

  it('can be approved by another user, with an optional comment', () => {
    const request = makeRequest({ userId: OWNER });
    request.approve(VALIDATOR, 'Enjoy!');
    expect(request.status).toBe(VacationRequestStatus.Approved);
    expect(request.comments).toBe('Enjoy!');
  });

  it('cannot be approved or rejected by its owner (dual-role users)', () => {
    const request = makeRequest({ userId: OWNER });
    expect(() => request.approve(OWNER, null)).toThrow(
      expect.objectContaining({ code: ErrorCode.SelfDecisionForbidden }),
    );
    expect(() => request.reject(OWNER, 'no')).toThrow(
      expect.objectContaining({ code: ErrorCode.SelfDecisionForbidden }),
    );
  });

  it('requires a non-blank comment to be rejected (rule 6)', () => {
    const request = makeRequest({ userId: OWNER });
    expect(() => request.reject(VALIDATOR, '   ')).toThrow(
      expect.objectContaining({ code: ErrorCode.RejectionCommentRequired }),
    );
    request.reject(VALIDATOR, '  Busy season  ');
    expect(request.status).toBe(VacationRequestStatus.Rejected);
    expect(request.comments).toBe('Busy season');
  });

  it.each([VacationRequestStatus.Approved, VacationRequestStatus.Rejected])(
    'cannot be modified once %s (rule 4)',
    (status) => {
      const request = makeRequest({ userId: OWNER, status, comments: 'x' });
      const period = { startDate: '2026-12-01', endDate: '2026-12-02' };
      expect(() => request.reschedule({ period, reason: null })).toThrow(
        expect.objectContaining({ code: ErrorCode.RequestNotPending }),
      );
      expect(() => request.approve(VALIDATOR, null)).toThrow(
        expect.objectContaining({ code: ErrorCode.RequestNotPending }),
      );
    },
  );

  it('detects stale versions (optimistic locking)', () => {
    const request = makeRequest({ version: 3 });
    expect(() => request.assertVersion(3)).not.toThrow();
    expect(() => request.assertVersion(2)).toThrow(
      expect.objectContaining({ code: ErrorCode.VersionConflict }),
    );
  });
});
