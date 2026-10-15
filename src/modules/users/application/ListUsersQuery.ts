/**
 * ListUsersQuery: paginated user directory for validators (feeds the "filter by user" dropdown).
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import type { PageRequest, PaginatedResult } from '../../../shared/persistence/pagination';
import { toPaginatedResult } from '../../../shared/persistence/pagination';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { UserListFilter } from '../domain/UserRepository';
import type { UserDto } from './userDto';
import { toUserDto } from './userDto';

export interface ListUsersPayload {
  readonly filter: UserListFilter;
  readonly page: PageRequest;
}

export class ListUsersQuery extends Query<ListUsersPayload, PaginatedResult<UserDto>> {}

export class ListUsersHandler implements QueryHandler<ListUsersQuery, PaginatedResult<UserDto>> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: ListUsersQuery): Promise<PaginatedResult<UserDto>> {
    const page = await this.repositories.users.list(payload.filter, payload.page);
    return toPaginatedResult(page, payload.page, toUserDto);
  }
}
