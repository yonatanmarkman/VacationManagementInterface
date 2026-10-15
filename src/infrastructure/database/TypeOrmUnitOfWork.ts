/**
 * UnitOfWork implementation on top of a TypeORM transaction.
 *
 * Repositories handed to the work are bound to the transaction's EntityManager.
 * Raised events are buffered and published only after COMMIT succeeds.
 */
import type { DataSource, EntityManager } from 'typeorm';
import type { DomainEvent } from '../../shared/cqrs/DomainEvent';
import type { EventBus } from '../../shared/cqrs/EventBus';
import type {
  Repositories,
  TransactionScope,
  UnitOfWork,
} from '../../shared/persistence/UnitOfWork';
import { translateDatabaseError } from './databaseErrors';

export type RepositoryFactory = (manager: EntityManager) => Repositories;

export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(
    private readonly dataSource: Pick<DataSource, 'transaction'>,
    private readonly createRepositories: RepositoryFactory,
    private readonly eventBus: EventBus,
  ) {}

  async run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> {
    const pendingEvents: DomainEvent[] = [];
    let result: T;
    try {
      result = await this.dataSource.transaction((manager) =>
        work({
          repositories: this.createRepositories(manager),
          raise: (event) => pendingEvents.push(event),
        }),
      );
    } catch (error) {
      throw translateDatabaseError(error);
    }
    await this.eventBus.publish(pendingEvents);
    return result;
  }
}
