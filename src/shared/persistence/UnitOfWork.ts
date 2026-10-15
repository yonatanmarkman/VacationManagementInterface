/**
 * Unit of work: runs a piece of business logic inside one database transaction.
 *
 * - All repository calls made through `scope.repositories` share the transaction.
 * - Events raised with `scope.raise()` are published only after a successful commit.
 * - If the work throws, the transaction is rolled back and no event is published.
 */
import type { DomainEvent } from '../cqrs/DomainEvent';
import type { TeamVacationPlanRepository } from '../../modules/teams/domain/TeamVacationPlanRepository';
import type { UserRepository } from '../../modules/users/domain/UserRepository';
import type { VacationRequestRepository } from '../../modules/vacation-requests/domain/VacationRequestRepository';

/** The repositories available to application code. */
export interface Repositories {
  readonly users: UserRepository;
  readonly vacationRequests: VacationRequestRepository;
  readonly teamVacationPlans: TeamVacationPlanRepository;
}

/** What a unit of work exposes to the code running inside it. */
export interface TransactionScope {
  readonly repositories: Repositories;
  /** Records an event to publish once the transaction has committed. */
  raise(event: DomainEvent): void;
}

export interface UnitOfWork {
  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}
