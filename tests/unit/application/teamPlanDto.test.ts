/**
 * Unit tests for the team plan view: per-participant statuses, the summary counts, and
 * the privacy rule for validator comments.
 */
import { canViewPlan, toTeamPlanDto } from '../../../src/modules/teams/application/teamPlanDto';
import { TeamVacationPlan } from '../../../src/modules/teams/domain/TeamVacationPlan';
import type { Principal } from '../../../src/modules/auth/domain/Principal';
import { UserRole } from '../../../src/modules/users/domain/UserRole';
import { VacationRequestStatus } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';
import { makeRequest, makeUser } from '../support/fixtures';

const proposer = makeUser(1, { name: 'Noa' });
const teammate = makeUser(2, { name: 'Maya' });
const plan = Object.assign(
  TeamVacationPlan.propose({
    proposerId: proposer.id,
    teamId: 1,
    startDate: '2026-12-20',
    endDate: '2026-12-24',
    reason: 'Offsite',
  }),
  { id: 9, proposer, createdAt: new Date('2026-10-15T10:00:00Z') },
);
const requests = [
  Object.assign(
    makeRequest({ id: 1, userId: proposer.id, status: VacationRequestStatus.Approved }),
    {
      teamPlanId: 9,
      user: proposer,
    },
  ),
  Object.assign(
    makeRequest({
      id: 2,
      userId: teammate.id,
      status: VacationRequestStatus.Rejected,
      comments: 'Deadline',
    }),
    { teamPlanId: 9, user: teammate },
  ),
];
const viewer = (user: { id: number; name: string }, roles = [UserRole.Requester]): Principal => ({
  id: user.id,
  name: user.name,
  email: `${user.id}@example.com`,
  roles,
  teamId: 1,
});

describe('toTeamPlanDto', () => {
  it("lists every participant's status and counts them", () => {
    const dto = toTeamPlanDto(plan, requests, viewer(proposer));
    expect(dto.participants.map((p) => [p.name, p.status, p.isProposer])).toEqual([
      ['Noa', 'Approved', true],
      ['Maya', 'Rejected', false],
    ]);
    expect(dto.summary).toEqual({ Pending: 0, Approved: 1, Rejected: 1 });
  });

  it("hides other participants' comments, but not from them or from validators", () => {
    const comment = (principal: Principal) =>
      toTeamPlanDto(plan, requests, principal).participants[1].comments;
    expect(comment(viewer(proposer))).toBeNull();
    expect(comment(viewer(teammate))).toBe('Deadline');
    expect(comment(viewer({ id: 3, name: 'Sarah' }, [UserRole.Validator]))).toBe('Deadline');
  });
});

describe('canViewPlan', () => {
  it('allows the proposer, participants and validators only', () => {
    expect(canViewPlan(plan, requests, viewer(proposer))).toBe(true);
    expect(canViewPlan(plan, requests, viewer(teammate))).toBe(true);
    expect(canViewPlan(plan, requests, viewer({ id: 3, name: 'V' }, [UserRole.Validator]))).toBe(
      true,
    );
    expect(canViewPlan(plan, requests, viewer({ id: 4, name: 'Outsider' }))).toBe(false);
  });
});
