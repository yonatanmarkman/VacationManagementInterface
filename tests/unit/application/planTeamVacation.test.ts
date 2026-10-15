/**
 * Unit tests for PlanTeamVacationCommand: participant validation, all-or-nothing creation and raised events.
 */
import {
  PlanTeamVacationCommand,
  PlanTeamVacationHandler,
} from '../../../src/modules/teams/application/PlanTeamVacationCommand';
import { TeamVacationPlannedEvent } from '../../../src/modules/teams/events/TeamVacationPlannedEvent';
import { UserRole } from '../../../src/modules/users/domain/UserRole';
import { VacationRequestCreatedEvent } from '../../../src/modules/vacation-requests/events/VacationRequestCreatedEvent';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import { FixedClock } from '../../../src/shared/time/Clock';
import { makeRequest, makeUser, TODAY } from '../support/fixtures';
import { createInMemoryPersistence } from '../support/InMemoryPersistence';

const proposer = makeUser(1, { teamId: 1 });
const teammate = makeUser(2, { teamId: 1 });
const teammateValidator = makeUser(3, { teamId: 1, roles: [UserRole.Validator] });
const outsider = makeUser(4, { teamId: 2 });
const users = [proposer, teammate, teammateValidator, outsider];

const plan = (participantIds: number[]) =>
  new PlanTeamVacationCommand({
    proposerId: proposer.id,
    startDate: '2026-12-20',
    endDate: '2026-12-24',
    reason: 'Team retreat',
    participantIds,
  });

describe('PlanTeamVacationHandler', () => {
  it('stores the plan and links one request per participant to it, proposer included', async () => {
    const { unitOfWork, vacationRequests, teamVacationPlans } = createInMemoryPersistence(users);
    const handler = new PlanTeamVacationHandler(unitOfWork, new FixedClock(TODAY));

    const { plan: stored, requests } = await handler.execute(plan([teammate.id, teammate.id]));

    expect(teamVacationPlans.plans.size).toBe(1);
    expect(stored).toMatchObject({ proposerId: proposer.id, teamId: proposer.teamId });
    expect(requests.map((request) => request.userId)).toEqual([proposer.id, teammate.id]);
    expect(requests.every((request) => request.teamPlanId === stored.id)).toBe(true);
    expect(vacationRequests.rows.size).toBe(2);
    expect(unitOfWork.publishedEvents).toEqual([
      expect.any(VacationRequestCreatedEvent),
      expect.any(VacationRequestCreatedEvent),
      expect.any(TeamVacationPlannedEvent),
    ]);
  });

  it('rejects participants outside the team or without the Requester role', async () => {
    const { unitOfWork } = createInMemoryPersistence(users);
    const handler = new PlanTeamVacationHandler(unitOfWork, new FixedClock(TODAY));

    await expect(
      handler.execute(plan([outsider.id, teammateValidator.id, 99])),
    ).rejects.toMatchObject({
      code: ErrorCode.InvalidParticipants,
      details: {
        invalidParticipants: [
          { userId: teammateValidator.id, reason: expect.stringContaining('Requester') },
          { userId: outsider.id, reason: expect.stringContaining('team') },
          { userId: 99, reason: expect.stringContaining('exist') },
        ],
      },
    });
  });

  it('creates nothing when any participant is unavailable, and reports every clash', async () => {
    const busy = makeRequest({
      id: 7,
      userId: teammate.id,
      startDate: '2026-12-22',
      endDate: '2026-12-30',
    });
    const { unitOfWork, vacationRequests, teamVacationPlans } = createInMemoryPersistence(users, [
      busy,
    ]);
    const handler = new PlanTeamVacationHandler(unitOfWork, new FixedClock(TODAY));

    await expect(handler.execute(plan([teammate.id]))).rejects.toMatchObject({
      code: ErrorCode.TeamPlanConflict,
      details: {
        conflicts: [
          { userId: teammate.id, code: ErrorCode.VacationOverlap, conflictingRequestId: 7 },
        ],
      },
    });
    expect(vacationRequests.rows.size).toBe(1);
    expect(teamVacationPlans.plans.size).toBe(0);
    expect(unitOfWork.publishedEvents).toHaveLength(0);
  });
});
