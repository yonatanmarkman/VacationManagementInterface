/**
 * TypeORM implementation of VacationRequestRepository.
 *
 * Overlap checks use PostgreSQL's `daterange(...) && daterange(...)`: the same operator as the
 * `vacation_requests_no_overlap` exclusion constraint, so the application check and the
 * database guarantee agree exactly, and the GiST index behind the constraint is used.
 */
import { Brackets } from 'typeorm';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { Page, PageRequest } from '../../../shared/persistence/pagination';
import { offsetOf } from '../../../shared/persistence/pagination';
import type { DateRange } from '../../../shared/time/calendarDate';
import { VacationRequest } from '../domain/VacationRequest';
import type {
  VacationRequestFilter,
  VacationRequestRepository,
  VacationRequestSort,
  VacationRequestSortField,
} from '../domain/VacationRequestRepository';
import { ACTIVE_STATUSES } from '../domain/VacationRequestStatus';

const SORT_COLUMNS: Record<VacationRequestSortField, string> = {
  createdAt: 'request.createdAt',
  startDate: 'request.startDate',
  endDate: 'request.endDate',
};

const OVERLAPS_PERIOD =
  "daterange(request.start_date, request.end_date, '[]') && daterange(CAST(:startDate AS date), CAST(:endDate AS date), '[]')";

export class TypeOrmVacationRequestRepository implements VacationRequestRepository {
  private readonly repository: Repository<VacationRequest>;

  constructor(manager: EntityManager) {
    this.repository = manager.getRepository(VacationRequest);
  }

  findById(id: number): Promise<VacationRequest | null> {
    return this.withUserAndTeam().where('request.id = :id', { id }).getOne();
  }

  findByIdForUpdate(id: number): Promise<VacationRequest | null> {
    return this.repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  findConflictCandidates(
    userIds: readonly number[],
    period: DateRange,
    excludeRequestId?: number,
  ): Promise<VacationRequest[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }
    const query = this.repository
      .createQueryBuilder('request')
      .where('request.user_id IN (:...userIds)', { userIds })
      .andWhere(
        new Brackets((clash) =>
          clash
            .where('request.start_date = :startDate AND request.end_date = :endDate')
            .orWhere(`request.status IN (:...activeStatuses) AND ${OVERLAPS_PERIOD}`),
        ),
      )
      .setParameters({ ...period, activeStatuses: ACTIVE_STATUSES })
      .orderBy('request.start_date', 'ASC');
    if (excludeRequestId !== undefined) {
      query.andWhere('request.id <> :excludeRequestId', { excludeRequestId });
    }
    return query.getMany();
  }

  async list(
    filter: VacationRequestFilter,
    sort: VacationRequestSort,
    page: PageRequest,
  ): Promise<Page<VacationRequest>> {
    const query = this.withUserAndTeam()
      .orderBy(SORT_COLUMNS[sort.sortBy], sort.sortOrder === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('request.id', sort.sortOrder === 'asc' ? 'ASC' : 'DESC')
      // Joins are many-to-one only, so plain OFFSET/LIMIT is safe and efficient.
      .offset(offsetOf(page))
      .limit(page.limit);
    if (filter.userId !== undefined) {
      query.andWhere('request.user_id = :userId', { userId: filter.userId });
    }
    if (filter.teamId !== undefined) {
      query.andWhere('requester.team_id = :teamId', { teamId: filter.teamId });
    }
    if (filter.status !== undefined) {
      query.andWhere('request.status = :status', { status: filter.status });
    }
    if (filter.startDate !== undefined) {
      query.andWhere('request.start_date >= :fromDate', { fromDate: filter.startDate });
    }
    if (filter.endDate !== undefined) {
      query.andWhere('request.end_date <= :toDate', { toDate: filter.endDate });
    }
    const [items, totalItems] = await query.getManyAndCount();
    return { items, totalItems };
  }

  findTeamCalendar(teamId: number, range: DateRange): Promise<VacationRequest[]> {
    return this.withUserAndTeam()
      .where('requester.team_id = :teamId', { teamId })
      .andWhere('request.status IN (:...activeStatuses)', { activeStatuses: ACTIVE_STATUSES })
      .andWhere(OVERLAPS_PERIOD, range)
      .orderBy('request.start_date', 'ASC')
      .addOrderBy('requester.name', 'ASC')
      .getMany();
  }

  save(request: VacationRequest): Promise<VacationRequest> {
    return this.repository.save(request);
  }

  async remove(request: VacationRequest): Promise<void> {
    await this.repository.delete({ id: request.id });
  }

  private withUserAndTeam(): SelectQueryBuilder<VacationRequest> {
    return this.repository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.user', 'requester')
      .innerJoinAndSelect('requester.team', 'team');
  }
}
