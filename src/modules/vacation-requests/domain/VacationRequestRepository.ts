/**
 * Persistence contract for vacation requests. Implemented with TypeORM in
 * src/modules/vacation-requests/infrastructure/TypeOrmVacationRequestRepository.ts.
 */
import type { Page, PageRequest, SortOrder } from '../../../shared/persistence/pagination';
import type { DateRange, IsoDate } from '../../../shared/time/calendarDate';
import type { VacationRequest } from './VacationRequest';
import type { VacationRequestStatus } from './VacationRequestStatus';

/** Filters accepted by list queries. Date filters are inclusive. */
export interface VacationRequestFilter {
  readonly userId?: number;
  /** Requests of the members of this team. */
  readonly teamId?: number;
  readonly status?: VacationRequestStatus;
  /** Requests starting on or after this date. */
  readonly startDate?: IsoDate;
  /** Requests ending on or before this date. */
  readonly endDate?: IsoDate;
}

export type VacationRequestSortField = 'createdAt' | 'startDate' | 'endDate';

export interface VacationRequestSort {
  readonly sortBy: VacationRequestSortField;
  readonly sortOrder: SortOrder;
}

export interface VacationRequestRepository {
  /** Finds a request with its user, the user's team and its team plan (if any). */
  findById(id: number): Promise<VacationRequest | null>;

  /**
   * Finds a request and locks its row until the transaction ends (SELECT ... FOR UPDATE),
   * so concurrent writers on the same request are serialized. Only valid inside a unit of work.
   */
  findByIdForUpdate(id: number): Promise<VacationRequest | null>;

  /**
   * Requests of the given users that could clash with `period`: exact duplicates in any
   * status, plus Pending/Approved requests that overlap it.
   */
  findConflictCandidates(
    userIds: readonly number[],
    period: DateRange,
    excludeRequestId?: number,
  ): Promise<VacationRequest[]>;

  /** Paginated, filtered list (with users and teams). */
  list(
    filter: VacationRequestFilter,
    sort: VacationRequestSort,
    page: PageRequest,
  ): Promise<Page<VacationRequest>>;

  /** Pending/Approved requests of a team's members that overlap `range`, ordered by start date. */
  findTeamCalendar(teamId: number, range: DateRange): Promise<VacationRequest[]>;

  /** Requests (with users) belonging to the given team vacation plans. */
  findByTeamPlanIds(planIds: readonly number[]): Promise<VacationRequest[]>;

  /** Inserts or updates a request and returns the stored version. */
  save(request: VacationRequest): Promise<VacationRequest>;

  /** Deletes a request. */
  remove(request: VacationRequest): Promise<void>;
}
