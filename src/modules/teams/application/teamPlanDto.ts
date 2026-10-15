/**
 * JSON shape of a team vacation plan: the plan itself plus how each participant's request
 * was decided, so the proposer and the participants can follow the outcome.
 *
 * Privacy: validator comments are shown only to the participant they concern and to
 * validators (consistent with rule 8). Participants who cancelled their request are no
 * longer listed.
 */
import type { IsoDate } from '../../../shared/time/calendarDate';
import type { Principal } from '../../auth/domain/Principal';
import type { TeamDto } from '../../users/application/userDto';
import { UserRole } from '../../users/domain/UserRole';
import type { VacationRequest } from '../../vacation-requests/domain/VacationRequest';
import { VacationRequestStatus } from '../../vacation-requests/domain/VacationRequestStatus';
import type { TeamVacationPlan } from '../domain/TeamVacationPlan';

export interface TeamPlanParticipantDto {
  readonly userId: number;
  readonly name: string;
  readonly requestId: number;
  readonly status: VacationRequestStatus;
  /** Validator comment; null unless the viewer is this participant or a validator. */
  readonly comments: string | null;
  readonly isProposer: boolean;
}

export interface TeamPlanDto {
  readonly id: number;
  readonly proposedBy: { readonly id: number; readonly name: string };
  readonly team: TeamDto | null;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly participants: TeamPlanParticipantDto[];
  /** Number of participants per status. */
  readonly summary: Record<VacationRequestStatus, number>;
}

export function toTeamPlanDto(
  plan: TeamVacationPlan,
  requests: readonly VacationRequest[],
  viewer: Principal,
): TeamPlanDto {
  const viewerIsValidator = viewer.roles.includes(UserRole.Validator);
  const participants = requests
    .filter((request) => request.teamPlanId === plan.id)
    .map((request) => ({
      userId: request.userId,
      name: request.user?.name ?? '',
      requestId: request.id,
      status: request.status,
      comments: viewerIsValidator || request.userId === viewer.id ? request.comments : null,
      isProposer: request.userId === plan.proposerId,
    }));
  const summary = Object.fromEntries(
    Object.values(VacationRequestStatus).map((status) => [
      status,
      participants.filter((participant) => participant.status === status).length,
    ]),
  ) as Record<VacationRequestStatus, number>;

  return {
    id: plan.id,
    proposedBy: { id: plan.proposerId, name: plan.proposer?.name ?? '' },
    team: plan.team ? { id: plan.team.id, name: plan.team.name } : null,
    startDate: plan.startDate,
    endDate: plan.endDate,
    reason: plan.reason,
    createdAt: plan.createdAt.toISOString(),
    participants,
    summary,
  };
}

/** Whether the viewer may see a plan: its proposer, its participants and validators. */
export function canViewPlan(
  plan: TeamVacationPlan,
  requests: readonly VacationRequest[],
  viewer: Principal,
): boolean {
  return (
    plan.proposerId === viewer.id ||
    viewer.roles.includes(UserRole.Validator) ||
    requests.some((request) => request.userId === viewer.id)
  );
}
