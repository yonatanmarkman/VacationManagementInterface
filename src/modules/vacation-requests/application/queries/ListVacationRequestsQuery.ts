/**
 * ListVacationRequestsQuery: every request in the system (validator dashboard),
 * filtered by status / user / dates, sorted and paginated.
 */
import { Query } from '../../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../../shared/cqrs/Query';
import type { PageRequest, PaginatedResult } from '../../../../shared/persistence/pagination';
import { toPaginatedResult } from '../../../../shared/persistence/pagination';
import type { Repositories } from '../../../../shared/persistence/UnitOfWork';
import type {
  VacationRequestFilter,
  VacationRequestSort,
} from '../../domain/VacationRequestRepository';
import type { VacationRequestDto } from '../vacationRequestDto';
import { toVacationRequestDto } from '../vacationRequestDto';

export interface ListVacationRequestsPayload {
  readonly filter: VacationRequestFilter;
  readonly sort: VacationRequestSort;
  readonly page: PageRequest;
}

export class ListVacationRequestsQuery extends Query<
  ListVacationRequestsPayload,
  PaginatedResult<VacationRequestDto>
> {}

export class ListVacationRequestsHandler implements QueryHandler<
  ListVacationRequestsQuery,
  PaginatedResult<VacationRequestDto>
> {
  constructor(private readonly repositories: Repositories) {}

  async execute({
    payload,
  }: ListVacationRequestsQuery): Promise<PaginatedResult<VacationRequestDto>> {
    const page = await this.repositories.vacationRequests.list(
      payload.filter,
      payload.sort,
      payload.page,
    );
    return toPaginatedResult(page, payload.page, toVacationRequestDto);
  }
}
