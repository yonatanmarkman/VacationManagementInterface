/**
 * ListMyTeamPlansQuery: team vacation plans the caller proposed or takes part in, newest
 * first, each with every participant's status. Two queries per page: the plans, then all
 * their requests at once (no N+1).
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import type { PageRequest, PaginatedResult } from '../../../shared/persistence/pagination';
import { toPaginatedResult } from '../../../shared/persistence/pagination';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { Principal } from '../../auth/domain/Principal';
import type { TeamPlanDto } from './teamPlanDto';
import { toTeamPlanDto } from './teamPlanDto';

export interface ListMyTeamPlansPayload {
  readonly viewer: Principal;
  readonly page: PageRequest;
}

export class ListMyTeamPlansQuery extends Query<
  ListMyTeamPlansPayload,
  PaginatedResult<TeamPlanDto>
> {}

export class ListMyTeamPlansHandler implements QueryHandler<
  ListMyTeamPlansQuery,
  PaginatedResult<TeamPlanDto>
> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: ListMyTeamPlansQuery): Promise<PaginatedResult<TeamPlanDto>> {
    const plans = await this.repositories.teamVacationPlans.listForUser(
      payload.viewer.id,
      payload.page,
    );
    const requests = await this.repositories.vacationRequests.findByTeamPlanIds(
      plans.items.map((plan) => plan.id),
    );
    return toPaginatedResult(plans, payload.page, (plan) =>
      toTeamPlanDto(plan, requests, payload.viewer),
    );
  }
}
