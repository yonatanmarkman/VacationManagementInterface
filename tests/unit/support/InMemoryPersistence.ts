/**
 * In-memory implementations of the repositories and the unit of work, so command
 * handlers can be unit-tested without a database. They mimic the relevant semantics:
 * ids and versions are assigned on save, and events are published only if the work succeeds.
 */
import type { DomainEvent } from '../../../src/shared/cqrs/DomainEvent';
import type { Page } from '../../../src/shared/persistence/pagination';
import type {
  Repositories,
  TransactionScope,
  UnitOfWork,
} from '../../../src/shared/persistence/UnitOfWork';
import type { DateRange } from '../../../src/shared/time/calendarDate';
import { rangesOverlap } from '../../../src/shared/time/calendarDate';
import type { User } from '../../../src/modules/users/domain/User';
import type { UserRepository } from '../../../src/modules/users/domain/UserRepository';
import { VacationRequest } from '../../../src/modules/vacation-requests/domain/VacationRequest';
import type { VacationRequestRepository } from '../../../src/modules/vacation-requests/domain/VacationRequestRepository';
import { ACTIVE_STATUSES } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';

export class InMemoryUserRepository implements UserRepository {
  constructor(readonly users: User[] = []) {}

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByIds(ids: readonly number[]): Promise<User[]> {
    return this.users.filter((user) => ids.includes(user.id));
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findTeamMembers(teamId: number): Promise<User[]> {
    return this.users.filter((user) => user.teamId === teamId);
  }

  async list(): Promise<Page<User>> {
    return { items: this.users, totalItems: this.users.length };
  }
}

export class InMemoryVacationRequestRepository implements VacationRequestRepository {
  private nextId = 1000;
  readonly rows = new Map<number, VacationRequest>();

  constructor(
    private readonly users: InMemoryUserRepository,
    initial: VacationRequest[] = [],
  ) {
    initial.forEach((request) => this.rows.set(request.id, copy(request)));
  }

  async findById(id: number): Promise<VacationRequest | null> {
    const row = this.rows.get(id);
    if (!row) {
      return null;
    }
    const result = copy(row);
    result.user = (await this.users.findById(row.userId)) ?? undefined;
    return result;
  }

  async findByIdForUpdate(id: number): Promise<VacationRequest | null> {
    const row = this.rows.get(id);
    return row ? copy(row) : null;
  }

  async findConflictCandidates(
    userIds: readonly number[],
    period: DateRange,
    excludeRequestId?: number,
  ): Promise<VacationRequest[]> {
    return [...this.rows.values()]
      .filter((row) => userIds.includes(row.userId) && row.id !== excludeRequestId)
      .filter(
        (row) =>
          (row.startDate === period.startDate && row.endDate === period.endDate) ||
          (ACTIVE_STATUSES.includes(row.status) && rangesOverlap(row.period, period)),
      )
      .map(copy);
  }

  async list(): Promise<Page<VacationRequest>> {
    return { items: [...this.rows.values()].map(copy), totalItems: this.rows.size };
  }

  async findTeamCalendar(): Promise<VacationRequest[]> {
    return [];
  }

  async save(request: VacationRequest): Promise<VacationRequest> {
    const now = new Date();
    if (request.id === undefined) {
      Object.assign(request, { id: this.nextId++, version: 1, createdAt: now, updatedAt: now });
    } else {
      Object.assign(request, { version: request.version + 1, updatedAt: now });
    }
    this.rows.set(request.id, copy(request));
    return request;
  }

  async remove(request: VacationRequest): Promise<void> {
    this.rows.delete(request.id);
  }
}

/** Runs work immediately; records published events only when the work succeeds. */
export class InMemoryUnitOfWork implements UnitOfWork {
  readonly publishedEvents: DomainEvent[] = [];

  constructor(readonly repositories: Repositories) {}

  async run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> {
    const pending: DomainEvent[] = [];
    const result = await work({
      repositories: this.repositories,
      raise: (event) => pending.push(event),
    });
    this.publishedEvents.push(...pending);
    return result;
  }
}

/** Builds a complete in-memory persistence setup. */
export function createInMemoryPersistence(users: User[], requests: VacationRequest[] = []) {
  const userRepository = new InMemoryUserRepository(users);
  const vacationRequests = new InMemoryVacationRequestRepository(userRepository, requests);
  const repositories: Repositories = { users: userRepository, vacationRequests };
  return { repositories, vacationRequests, unitOfWork: new InMemoryUnitOfWork(repositories) };
}

function copy(request: VacationRequest): VacationRequest {
  return Object.assign(Object.create(VacationRequest.prototype) as VacationRequest, request);
}
