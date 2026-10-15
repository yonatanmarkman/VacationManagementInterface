/**
 * Persistence contract for users. Implemented with TypeORM in
 * src/modules/users/infrastructure/TypeOrmUserRepository.ts.
 */
import type { Page, PageRequest } from '../../../shared/persistence/pagination';
import type { User } from './User';
import type { UserRole } from './UserRole';

export interface UserListFilter {
  readonly teamId?: number;
  readonly role?: UserRole;
}

export interface UserRepository {
  /** Finds a user with their team. */
  findById(id: number): Promise<User | null>;

  /** Finds users (with their team) by id; unknown ids are simply missing from the result. */
  findByIds(ids: readonly number[]): Promise<User[]>;

  /** Finds a user by email, including the password hash (for login only). */
  findByEmailWithPassword(email: string): Promise<User | null>;

  /** All members of a team, ordered by name. */
  findTeamMembers(teamId: number): Promise<User[]>;

  /** Paginated list of users, ordered by name. */
  list(filter: UserListFilter, page: PageRequest): Promise<Page<User>>;
}
