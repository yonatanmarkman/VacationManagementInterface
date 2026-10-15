/**
 * GetTeamPlanQuery: one team vacation plan with every participant's status.
 * Visible to its proposer, its participants and validators; anyone else gets "not found".
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import { NotFoundError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { Principal } from '../../auth/domain/Principal';
import type { TeamPlanDto } from './teamPlanDto';
import { canViewPlan, toTeamPlanDto } from './teamPlanDto';

export interface GetTeamPlanPayload {
  readonly planId: number;
  readonly viewer: Principal;
}

export class GetTeamPlanQuery extends Query<GetTeamPlanPayload, TeamPlanDto> {}

export class GetTeamPlanHandler implements QueryHandler<GetTeamPlanQuery, TeamPlanDto> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: GetTeamPlanQuery): Promise<TeamPlanDto> {
    const plan = await this.repositories.teamVacationPlans.findById(payload.planId);
    const requests = plan
      ? await this.repositories.vacationRequests.findByTeamPlanIds([plan.id])
      : [];
    if (!plan || !canViewPlan(plan, requests, payload.viewer)) {
      throw new NotFoundError(
        ErrorCode.TeamPlanNotFound,
        `Team vacation plan ${payload.planId} was not found.`,
      );
    }
    return toTeamPlanDto(plan, requests, payload.viewer);
  }
}
