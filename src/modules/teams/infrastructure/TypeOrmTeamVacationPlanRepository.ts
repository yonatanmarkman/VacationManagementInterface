/**
 * TypeORM implementation of TeamVacationPlanRepository.
 */
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { Page, PageRequest } from '../../../shared/persistence/pagination';
import { offsetOf } from '../../../shared/persistence/pagination';
import { TeamVacationPlan } from '../domain/TeamVacationPlan';
import type { TeamVacationPlanRepository } from '../domain/TeamVacationPlanRepository';

export class TypeOrmTeamVacationPlanRepository implements TeamVacationPlanRepository {
  private readonly repository: Repository<TeamVacationPlan>;

  constructor(manager: EntityManager) {
    this.repository = manager.getRepository(TeamVacationPlan);
  }

  save(plan: TeamVacationPlan): Promise<TeamVacationPlan> {
    return this.repository.save(plan);
  }

  findById(id: number): Promise<TeamVacationPlan | null> {
    return this.withProposerAndTeam().where('plan.id = :id', { id }).getOne();
  }

  async listForUser(userId: number, page: PageRequest): Promise<Page<TeamVacationPlan>> {
    const [items, totalItems] = await this.withProposerAndTeam()
      .where('plan.proposer_id = :userId', { userId })
      .orWhere(
        'EXISTS (SELECT 1 FROM vacation_requests vr WHERE vr.team_plan_id = plan.id AND vr.user_id = :userId)',
        { userId },
      )
      .orderBy('plan.createdAt', 'DESC')
      .addOrderBy('plan.id', 'DESC')
      .offset(offsetOf(page))
      .limit(page.limit)
      .getManyAndCount();
    return { items, totalItems };
  }

  private withProposerAndTeam(): SelectQueryBuilder<TeamVacationPlan> {
    return this.repository
      .createQueryBuilder('plan')
      .innerJoinAndSelect('plan.proposer', 'proposer')
      .innerJoinAndSelect('plan.team', 'team');
  }
}
