/**
 * TypeORM DataSource factory and the repository factory bound to an EntityManager.
 *
 * Entities and migrations are listed explicitly (no globs), so the app also works when bundled.
 * `synchronize` is off: the schema is owned by migrations.
 */
import { types } from 'pg';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { AppConfig } from '../../config/config';
import type { Repositories } from '../../shared/persistence/UnitOfWork';
import { Team } from '../../modules/teams/domain/Team';
import { User } from '../../modules/users/domain/User';
import { TypeOrmUserRepository } from '../../modules/users/infrastructure/TypeOrmUserRepository';
import { VacationRequest } from '../../modules/vacation-requests/domain/VacationRequest';
import { TypeOrmVacationRequestRepository } from '../../modules/vacation-requests/infrastructure/TypeOrmVacationRequestRepository';
import { InitialSchema1760500000000 } from './migrations/1760500000000-InitialSchema';

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Dates at local midnight,
// which avoids any timezone shifting of vacation days.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

export function createDataSource(
  database: AppConfig['database'],
  databaseName = database.name,
): DataSource {
  return new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.user,
    password: database.password,
    database: databaseName,
    entities: [Team, User, VacationRequest],
    migrations: [InitialSchema1760500000000],
    synchronize: false,
    logging: database.logQueries ? 'all' : false,
    applicationName: 'vacation-management-api',
    extra: { max: database.poolSize },
  });
}

/** Builds the repositories bound to an EntityManager (transactional or not). */
export function createRepositories(manager: EntityManager): Repositories {
  return {
    users: new TypeOrmUserRepository(manager),
    vacationRequests: new TypeOrmVacationRequestRepository(manager),
  };
}
