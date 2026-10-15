/**
 * PlanTeamVacationCommand: a requester proposes a vacation for themselves and teammates.
 *
 * The plan is stored, and one Pending request linked to it is created per participant,
 * all or nothing:
 * - the proposer is always a participant;
 * - every participant must exist, be in the proposer's team and hold the Requester role;
 * - every participant must be free (rules 2 and 3); all clashes are reported together;
 * - all requests are inserted in one transaction, in ascending user id order so that
 *   concurrent plans touching the same people cannot deadlock.
 */
import { Command } from '../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../shared/cqrs/Command';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { UnitOfWork } from '../../../shared/persistence/UnitOfWork';
import type { DateRange, IsoDate } from '../../../shared/time/calendarDate';
import type { Clock } from '../../../shared/time/Clock';
import type { User } from '../../users/domain/User';
import { UserRole } from '../../users/domain/UserRole';
import { VacationRequest } from '../../vacation-requests/domain/VacationRequest';
import { TeamVacationPlan } from '../domain/TeamVacationPlan';
import {
  assertValidVacationPeriod,
  describeConflict,
  findSchedulingConflict,
} from '../../vacation-requests/domain/vacationRequestRules';
import { VacationRequestCreatedEvent } from '../../vacation-requests/events/VacationRequestCreatedEvent';
import { reloadRequest } from '../../vacation-requests/application/commands/reloadRequest';
import { TeamVacationPlannedEvent } from '../events/TeamVacationPlannedEvent';

export interface PlanTeamVacationPayload {
  readonly proposerId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
  /** Teammates invited to the vacation (the proposer is added automatically). */
  readonly participantIds: readonly number[];
}

/** The stored plan and the request created for each participant (with users). */
export interface PlannedTeamVacation {
  readonly plan: TeamVacationPlan;
  readonly requests: VacationRequest[];
}

export class PlanTeamVacationCommand extends Command<
  PlanTeamVacationPayload,
  PlannedTeamVacation
> {}

export class PlanTeamVacationHandler implements CommandHandler<
  PlanTeamVacationCommand,
  PlannedTeamVacation
> {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute({ payload }: PlanTeamVacationCommand): Promise<PlannedTeamVacation> {
    const period: DateRange = { startDate: payload.startDate, endDate: payload.endDate };
    assertValidVacationPeriod(period, this.clock.today());

    return this.unitOfWork.run(async ({ repositories, raise }) => {
      const proposer = await repositories.users.findById(payload.proposerId);
      if (!proposer) {
        throw new AuthenticationError(ErrorCode.InvalidToken, 'Your account no longer exists.');
      }
      const participantIds = [...new Set([proposer.id, ...payload.participantIds])].sort(
        (a, b) => a - b,
      );
      const participants = await repositories.users.findByIds(participantIds);
      assertValidParticipants(proposer, participantIds, participants);

      const candidates = await repositories.vacationRequests.findConflictCandidates(
        participantIds,
        period,
      );
      assertParticipantsAvailable(period, participants, candidates);

      const plan = await repositories.teamVacationPlans.save(
        TeamVacationPlan.propose({
          proposerId: proposer.id,
          teamId: proposer.teamId,
          ...period,
          reason: payload.reason,
        }),
      );
      const created: VacationRequest[] = [];
      for (const userId of participantIds) {
        const saved = await repositories.vacationRequests.save(
          VacationRequest.submit({
            userId,
            ...period,
            reason: payload.reason,
            teamPlanId: plan.id,
          }),
        );
        raise(
          new VacationRequestCreatedEvent({
            requestId: saved.id,
            userId,
            ...period,
            proposedBy: proposer.id,
          }),
        );
        created.push(await reloadRequest(repositories, saved.id));
      }
      raise(
        new TeamVacationPlannedEvent({
          planId: plan.id,
          proposerId: proposer.id,
          teamId: proposer.teamId,
          ...period,
          participantIds,
          requestIds: created.map((request) => request.id),
        }),
      );
      return {
        plan: (await repositories.teamVacationPlans.findById(plan.id)) ?? plan,
        requests: created,
      };
    });
  }
}

function assertValidParticipants(
  proposer: User,
  participantIds: readonly number[],
  participants: readonly User[],
): void {
  const byId = new Map(participants.map((user) => [user.id, user]));
  const invalid = participantIds.flatMap((userId) => {
    const user = byId.get(userId);
    if (!user) {
      return [{ userId, reason: 'User does not exist.' }];
    }
    if (user.teamId !== proposer.teamId) {
      return [{ userId, reason: 'User is not a member of your team.' }];
    }
    if (!user.hasRole(UserRole.Requester)) {
      return [{ userId, reason: 'User does not have the Requester role.' }];
    }
    return [];
  });
  if (invalid.length > 0) {
    throw new ValidationError(
      ErrorCode.InvalidParticipants,
      'Some participants cannot join this team vacation.',
      { invalidParticipants: invalid },
    );
  }
}

function assertParticipantsAvailable(
  period: DateRange,
  participants: readonly User[],
  candidates: readonly VacationRequest[],
): void {
  const conflicts = participants.flatMap((user) => {
    const conflict = findSchedulingConflict(
      period,
      candidates.filter((request) => request.userId === user.id),
    );
    return conflict
      ? [
          {
            userId: user.id,
            userName: user.name,
            code: conflict.code,
            conflictingRequestId: conflict.conflictingRequest.id,
            message: describeConflict(conflict),
          },
        ]
      : [];
  });
  if (conflicts.length > 0) {
    throw new ConflictError(
      ErrorCode.TeamPlanConflict,
      'Some participants already have vacation requests on these dates. No request was created.',
      { conflicts },
    );
  }
}
