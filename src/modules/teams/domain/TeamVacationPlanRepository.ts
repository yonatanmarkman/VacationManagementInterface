/**
 * Persistence contract for team vacation plans. Implemented with TypeORM in
 * src/modules/teams/infrastructure/TypeOrmTeamVacationPlanRepository.ts.
 */
import type { Page, PageRequest } from '../../../shared/persistence/pagination';
import type { TeamVacationPlan } from './TeamVacationPlan';

export interface TeamVacationPlanRepository {
  /** Inserts a plan and returns it with its generated id. */
  save(plan: TeamVacationPlan): Promise<TeamVacationPlan>;

  /** Finds a plan with its proposer and team. */
  findById(id: number): Promise<TeamVacationPlan | null>;

  /** Plans the user proposed or takes part in, newest first (with proposer and team). */
  listForUser(userId: number, page: PageRequest): Promise<Page<TeamVacationPlan>>;
}
