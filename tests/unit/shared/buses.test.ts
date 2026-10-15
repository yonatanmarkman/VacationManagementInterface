/**
 * Unit tests for the CQRS building blocks: command bus, event bus, unit of work (events after commit)
 * and translation of PostgreSQL constraint errors.
 */
import { QueryFailedError } from 'typeorm';
import type { DataSource } from 'typeorm';
import { TypeOrmUnitOfWork } from '../../../src/infrastructure/database/TypeOrmUnitOfWork';
import { DbConstraint } from '../../../src/infrastructure/database/constraints';
import { translateDatabaseError } from '../../../src/infrastructure/database/databaseErrors';
import { Command, CommandBus } from '../../../src/shared/cqrs/Command';
import { DomainEvent } from '../../../src/shared/cqrs/DomainEvent';
import { EventBus } from '../../../src/shared/cqrs/EventBus';
import { ConflictError } from '../../../src/shared/errors/AppError';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import type { Logger } from '../../../src/shared/logging/logger';
import type { Repositories } from '../../../src/shared/persistence/UnitOfWork';

const silentLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

class DoubleCommand extends Command<{ value: number }, number> {}
class UnregisteredCommand extends Command<object, void> {}
class SomethingHappened extends DomainEvent<{ id: number }> {
  readonly eventName = 'SomethingHappened';
}

describe('CommandBus', () => {
  it('dispatches a command to its handler and returns the result', async () => {
    const bus = new CommandBus(silentLogger).register(DoubleCommand, {
      execute: async ({ payload }) => payload.value * 2,
    });
    await expect(bus.execute(new DoubleCommand({ value: 21 }))).resolves.toBe(42);
  });

  it('fails loudly for unregistered commands and duplicate registrations', async () => {
    const bus = new CommandBus(silentLogger).register(DoubleCommand, { execute: async () => 0 });
    await expect(bus.execute(new UnregisteredCommand({}))).rejects.toThrow(/No command handler/);
    expect(() => bus.register(DoubleCommand, { execute: async () => 0 })).toThrow(
      /already registered/,
    );
  });
});

describe('EventBus', () => {
  it('delivers events to specific and global subscribers; a failing subscriber is isolated', async () => {
    const received: string[] = [];
    const bus = new EventBus(silentLogger)
      .subscribeToAll({
        name: 'audit',
        handle: (event) => void received.push(`audit:${event.eventName}`),
      })
      .subscribe(SomethingHappened, {
        name: 'broken',
        handle: () => {
          throw new Error('boom');
        },
      })
      .subscribe(SomethingHappened, {
        name: 'specific',
        handle: ({ payload }) => void received.push(`specific:${payload.id}`),
      });

    await expect(bus.publish([new SomethingHappened({ id: 1 })])).resolves.toBeUndefined();
    expect(received).toEqual(['audit:SomethingHappened', 'specific:1']);
    expect(silentLogger.error).toHaveBeenCalledWith(
      'Event subscriber failed',
      expect.objectContaining({ subscriber: 'broken' }),
    );
  });
});

describe('TypeOrmUnitOfWork', () => {
  const fakeDataSource = {
    transaction: (work: (manager: never) => Promise<unknown>) => work({} as never),
  } as unknown as Pick<DataSource, 'transaction'>;
  const createRepositories = () => ({}) as Repositories;

  it('publishes raised events only after the transaction succeeds', async () => {
    const eventBus = new EventBus(silentLogger);
    const publish = jest.spyOn(eventBus, 'publish');
    const unitOfWork = new TypeOrmUnitOfWork(fakeDataSource, createRepositories, eventBus);

    const result = await unitOfWork.run(async ({ raise }) => {
      raise(new SomethingHappened({ id: 1 }));
      expect(publish).not.toHaveBeenCalled();
      return 'done';
    });

    expect(result).toBe('done');
    expect(publish).toHaveBeenCalledWith([expect.any(SomethingHappened)]);
  });

  it('publishes nothing when the work fails', async () => {
    const eventBus = new EventBus(silentLogger);
    const publish = jest.spyOn(eventBus, 'publish');
    const unitOfWork = new TypeOrmUnitOfWork(fakeDataSource, createRepositories, eventBus);

    await expect(
      unitOfWork.run(async ({ raise }) => {
        raise(new SomethingHappened({ id: 1 }));
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('translateDatabaseError', () => {
  const pgError = (code: string, constraint?: string) =>
    new QueryFailedError('INSERT ...', [], Object.assign(new Error('pg'), { code, constraint }));

  it('maps the overlap exclusion constraint to VACATION_OVERLAP', () => {
    const error = translateDatabaseError(pgError('23P01', DbConstraint.NoOverlap));
    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ code: ErrorCode.VacationOverlap });
  });

  it('maps the unique dates constraint to DUPLICATE_VACATION_REQUEST', () => {
    expect(translateDatabaseError(pgError('23505', DbConstraint.UniqueUserDates))).toMatchObject({
      code: ErrorCode.DuplicateVacationRequest,
    });
  });

  it('maps deadlocks to CONCURRENT_MODIFICATION and leaves other errors untouched', () => {
    expect(translateDatabaseError(pgError('40P01'))).toMatchObject({
      code: ErrorCode.ConcurrentModification,
    });
    const other = pgError('42P01');
    expect(translateDatabaseError(other)).toBe(other);
  });
});
