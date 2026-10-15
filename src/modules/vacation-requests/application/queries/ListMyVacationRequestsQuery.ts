/**
 * ListMyVacationRequestsQuery: the requester's own requests (requester view), paginated.
 */
import { Query } from '../../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../../shared/cqrs/Query';
import type { PageRequest, PaginatedResult } from '../../../../shared/persistence/pagination';
import { toPaginatedResult } from '../../../../shared/persistence/pagination';
import type { Repositories } from '../../../../shared/persistence/UnitOfWork';
import type { VacationRequestSort } from '../../domain/VacationRequestRepository';
import type { VacationRequestStatus } from '../../domain/VacationRequestStatus';
import type { VacationRequestDto } from '../vacationRequestDto';
import { toVacationRequestDto } from '../vacationRequestDto';

export interface ListMyVacationRequestsPayload {
  readonly userId: number;
  readonly status?: VacationRequestStatus;
  readonly sort: VacationRequestSort;
  readonly page: PageRequest;
}

export class ListMyVacationRequestsQuery extends Query<
  ListMyVacationRequestsPayload,
  PaginatedResult<VacationRequestDto>
> {}

export class ListMyVacationRequestsHandler implements QueryHandler<
  ListMyVacationRequestsQuery,
  PaginatedResult<VacationRequestDto>
> {
  constructor(private readonly repositories: Repositories) {}

  async execute({
    payload,
  }: ListMyVacationRequestsQuery): Promise<PaginatedResult<VacationRequestDto>> {
    const page = await this.repositories.vacationRequests.list(
      { userId: payload.userId, status: payload.status },
      payload.sort,
      payload.page,
    );
    return toPaginatedResult(page, payload.page, toVacationRequestDto);
  }
}
