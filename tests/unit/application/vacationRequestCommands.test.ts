/**
 * Unit tests for the vacation request command handlers (create, update, cancel, approve, reject),
 * run against in-memory repositories with a fixed "today".
 */
import {
  ApproveVacationRequestCommand,
  ApproveVacationRequestHandler,
} from '../../../src/modules/vacation-requests/application/commands/ApproveVacationRequestCommand';
import {
  CancelVacationRequestCommand,
  CancelVacationRequestHandler,
} from '../../../src/modules/vacation-requests/application/commands/CancelVacationRequestCommand';
import {
  CreateVacationRequestCommand,
  CreateVacationRequestHandler,
} from '../../../src/modules/vacation-requests/application/commands/CreateVacationRequestCommand';
import {
  RejectVacationRequestCommand,
  RejectVacationRequestHandler,
} from '../../../src/modules/vacation-requests/application/commands/RejectVacationRequestCommand';
import {
  UpdateVacationRequestCommand,
  UpdateVacationRequestHandler,
} from '../../../src/modules/vacation-requests/application/commands/UpdateVacationRequestCommand';
import { VacationRequestStatus } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';
import { VacationRequestApprovedEvent } from '../../../src/modules/vacation-requests/events/VacationRequestApprovedEvent';
import { VacationRequestCreatedEvent } from '../../../src/modules/vacation-requests/events/VacationRequestCreatedEvent';
import { UserRole } from '../../../src/modules/users/domain/UserRole';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import { FixedClock } from '../../../src/shared/time/Clock';
import { makeRequest, makeUser, TODAY } from '../support/fixtures';
import { createInMemoryPersistence } from '../support/InMemoryPersistence';

const clock = new FixedClock(TODAY);
const requester = makeUser(1);
const otherRequester = makeUser(2);
const validator = makeUser(3, { roles: [UserRole.Validator] });
const dualRole = makeUser(4, { roles: [UserRole.Requester, UserRole.Validator] });

function setup(requests = [makeRequest({ id: 100, userId: requester.id })]) {
  return createInMemoryPersistence([requester, otherRequester, validator, dualRole], requests);
}

describe('CreateVacationRequestHandler', () => {
  it('creates a Pending request and raises VacationRequestCreatedEvent', async () => {
    const { unitOfWork } = setup([]);
    const handler = new CreateVacationRequestHandler(unitOfWork, clock);

    const request = await handler.execute(
      new CreateVacationRequestCommand({
        requesterId: requester.id,
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        reason: 'Trip',
      }),
    );

    expect(request).toMatchObject({ userId: requester.id, status: VacationRequestStatus.Pending });
    expect(request.user?.id).toBe(requester.id);
    expect(unitOfWork.publishedEvents).toEqual([expect.any(VacationRequestCreatedEvent)]);
  });

  it('refuses overlapping dates and raises no event', async () => {
    const { unitOfWork } = setup();
    const handler = new CreateVacationRequestHandler(unitOfWork, clock);
    const command = new CreateVacationRequestCommand({
      requesterId: requester.id,
      startDate: '2026-11-12',
      endDate: '2026-11-20',
      reason: null,
    });

    await expect(handler.execute(command)).rejects.toMatchObject({
      code: ErrorCode.VacationOverlap,
    });
    expect(unitOfWork.publishedEvents).toHaveLength(0);
  });

  it('allows the same dates for a different user', async () => {
    const { unitOfWork } = setup();
    const handler = new CreateVacationRequestHandler(unitOfWork, clock);
    await expect(
      handler.execute(
        new CreateVacationRequestCommand({
          requesterId: otherRequester.id,
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          reason: null,
        }),
      ),
    ).resolves.toMatchObject({ userId: otherRequester.id });
  });

  it('refuses a vacation starting today', async () => {
    const { unitOfWork } = setup([]);
    const handler = new CreateVacationRequestHandler(unitOfWork, clock);
    await expect(
      handler.execute(
        new CreateVacationRequestCommand({
          requesterId: requester.id,
          startDate: TODAY,
          endDate: '2026-10-18',
          reason: null,
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.StartDateNotInFuture });
  });
});

describe('UpdateVacationRequestHandler', () => {
  const update = (
    overrides: Partial<ConstructorParameters<typeof UpdateVacationRequestCommand>[0]>,
  ) =>
    new UpdateVacationRequestCommand({
      requestId: 100,
      requesterId: requester.id,
      version: 1,
      ...overrides,
    });

  it('reschedules a Pending request and bumps its version', async () => {
    const { unitOfWork } = setup();
    const handler = new UpdateVacationRequestHandler(unitOfWork, clock);

    const updated = await handler.execute(
      update({ startDate: '2026-11-11', endDate: '2026-11-14' }),
    );

    expect(updated).toMatchObject({ startDate: '2026-11-11', endDate: '2026-11-14', version: 2 });
  });

  it('does not treat the request being edited as a conflict with itself', async () => {
    const { unitOfWork } = setup();
    const handler = new UpdateVacationRequestHandler(unitOfWork, clock);
    await expect(handler.execute(update({ reason: 'New reason' }))).resolves.toMatchObject({
      reason: 'New reason',
    });
  });

  it("hides other users' requests (404)", async () => {
    const { unitOfWork } = setup();
    const handler = new UpdateVacationRequestHandler(unitOfWork, clock);
    await expect(
      handler.execute(update({ requesterId: otherRequester.id, reason: 'x' })),
    ).rejects.toMatchObject({ code: ErrorCode.VacationRequestNotFound });
  });

  it('refuses to modify an approved request (rule 4)', async () => {
    const approved = makeRequest({
      id: 100,
      userId: requester.id,
      status: VacationRequestStatus.Approved,
    });
    const { unitOfWork } = setup([approved]);
    const handler = new UpdateVacationRequestHandler(unitOfWork, clock);
    await expect(handler.execute(update({ reason: 'x' }))).rejects.toMatchObject({
      code: ErrorCode.RequestNotPending,
    });
  });

  it('refuses a stale version', async () => {
    const { unitOfWork } = setup([makeRequest({ id: 100, userId: requester.id, version: 2 })]);
    const handler = new UpdateVacationRequestHandler(unitOfWork, clock);
    await expect(handler.execute(update({ reason: 'x' }))).rejects.toMatchObject({
      code: ErrorCode.VersionConflict,
    });
  });
});

describe('CancelVacationRequestHandler', () => {
  it('deletes a Pending request', async () => {
    const { unitOfWork, vacationRequests } = setup();
    await new CancelVacationRequestHandler(unitOfWork).execute(
      new CancelVacationRequestCommand({ requestId: 100, requesterId: requester.id }),
    );
    expect(vacationRequests.rows.has(100)).toBe(false);
  });

  it('refuses to cancel a decided request', async () => {
    const rejected = makeRequest({
      id: 100,
      userId: requester.id,
      status: VacationRequestStatus.Rejected,
      comments: 'No',
    });
    const { unitOfWork } = setup([rejected]);
    await expect(
      new CancelVacationRequestHandler(unitOfWork).execute(
        new CancelVacationRequestCommand({ requestId: 100, requesterId: requester.id }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.RequestNotPending });
  });
});

describe('Approve / Reject handlers', () => {
  it('approves a request and raises VacationRequestApprovedEvent', async () => {
    const { unitOfWork } = setup();
    const approved = await new ApproveVacationRequestHandler(unitOfWork).execute(
      new ApproveVacationRequestCommand({
        requestId: 100,
        validatorId: validator.id,
        version: 1,
        comments: null,
      }),
    );
    expect(approved.status).toBe(VacationRequestStatus.Approved);
    expect(unitOfWork.publishedEvents).toEqual([expect.any(VacationRequestApprovedEvent)]);
  });

  it('forbids a dual-role user from approving their own request', async () => {
    const { unitOfWork } = setup([makeRequest({ id: 100, userId: dualRole.id })]);
    await expect(
      new ApproveVacationRequestHandler(unitOfWork).execute(
        new ApproveVacationRequestCommand({
          requestId: 100,
          validatorId: dualRole.id,
          version: 1,
          comments: null,
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.SelfDecisionForbidden });
  });

  it('requires a comment to reject, before touching the database', async () => {
    const { unitOfWork } = setup();
    const run = jest.spyOn(unitOfWork, 'run');
    await expect(
      new RejectVacationRequestHandler(unitOfWork).execute(
        new RejectVacationRequestCommand({
          requestId: 100,
          validatorId: validator.id,
          version: 1,
          comments: ' ',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.RejectionCommentRequired });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown request', async () => {
    const { unitOfWork } = setup([]);
    await expect(
      new RejectVacationRequestHandler(unitOfWork).execute(
        new RejectVacationRequestCommand({
          requestId: 999,
          validatorId: validator.id,
          version: 1,
          comments: 'No',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.VacationRequestNotFound });
  });

  it('refuses to decide twice', async () => {
    const approved = makeRequest({
      id: 100,
      userId: requester.id,
      status: VacationRequestStatus.Approved,
    });
    const { unitOfWork } = setup([approved]);
    await expect(
      new RejectVacationRequestHandler(unitOfWork).execute(
        new RejectVacationRequestCommand({
          requestId: 100,
          validatorId: validator.id,
          version: 1,
          comments: 'Changed my mind',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.RequestNotPending });
  });
});
