/**
 * Composition root: the single place where the application is wired together.
 *
 * It creates the database connection, the buses and the services, registers every
 * command/query handler and event subscriber, and exposes them to the HTTP layer.
 * Nothing else in the code base instantiates infrastructure.
 */
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../config/config';
import { loadConfig } from '../config/config';
import { createDataSource, createRepositories } from '../infrastructure/database/dataSource';
import { TypeOrmUnitOfWork } from '../infrastructure/database/TypeOrmUnitOfWork';
import {
  GetCurrentUserHandler,
  GetCurrentUserQuery,
} from '../modules/auth/application/GetCurrentUserQuery';
import { LoginCommand, LoginHandler } from '../modules/auth/application/LoginCommand';
import type { TokenService } from '../modules/auth/domain/ports';
import { BcryptPasswordHasher } from '../modules/auth/infrastructure/BcryptPasswordHasher';
import { JwtTokenService } from '../modules/auth/infrastructure/JwtTokenService';
import { AuditLogSubscriber } from '../modules/notifications/AuditLogSubscriber';
import { registerNotificationSubscribers } from '../modules/notifications/NotificationSubscriber';
import {
  GetTeamCalendarHandler,
  GetTeamCalendarQuery,
} from '../modules/teams/application/GetTeamCalendarQuery';
import {
  GetTeamMembersHandler,
  GetTeamMembersQuery,
} from '../modules/teams/application/GetTeamMembersQuery';
import {
  GetTeamPlanHandler,
  GetTeamPlanQuery,
} from '../modules/teams/application/GetTeamPlanQuery';
import {
  ListMyTeamPlansHandler,
  ListMyTeamPlansQuery,
} from '../modules/teams/application/ListMyTeamPlansQuery';
import {
  PlanTeamVacationCommand,
  PlanTeamVacationHandler,
} from '../modules/teams/application/PlanTeamVacationCommand';
import { ListUsersHandler, ListUsersQuery } from '../modules/users/application/ListUsersQuery';
import {
  ApproveVacationRequestCommand,
  ApproveVacationRequestHandler,
} from '../modules/vacation-requests/application/commands/ApproveVacationRequestCommand';
import {
  CancelVacationRequestCommand,
  CancelVacationRequestHandler,
} from '../modules/vacation-requests/application/commands/CancelVacationRequestCommand';
import {
  CreateVacationRequestCommand,
  CreateVacationRequestHandler,
} from '../modules/vacation-requests/application/commands/CreateVacationRequestCommand';
import {
  RejectVacationRequestCommand,
  RejectVacationRequestHandler,
} from '../modules/vacation-requests/application/commands/RejectVacationRequestCommand';
import {
  UpdateVacationRequestCommand,
  UpdateVacationRequestHandler,
} from '../modules/vacation-requests/application/commands/UpdateVacationRequestCommand';
import {
  GetVacationRequestHandler,
  GetVacationRequestQuery,
} from '../modules/vacation-requests/application/queries/GetVacationRequestQuery';
import {
  ListMyVacationRequestsHandler,
  ListMyVacationRequestsQuery,
} from '../modules/vacation-requests/application/queries/ListMyVacationRequestsQuery';
import {
  ListVacationRequestsHandler,
  ListVacationRequestsQuery,
} from '../modules/vacation-requests/application/queries/ListVacationRequestsQuery';
import { CommandBus } from '../shared/cqrs/Command';
import { EventBus } from '../shared/cqrs/EventBus';
import { QueryBus } from '../shared/cqrs/Query';
import { logger } from '../shared/logging/logger';
import type { Clock } from '../shared/time/Clock';
import { SystemClock } from '../shared/time/Clock';

export interface Container {
  readonly config: AppConfig;
  readonly dataSource: DataSource;
  readonly commandBus: CommandBus;
  readonly queryBus: QueryBus;
  readonly eventBus: EventBus;
  readonly tokenService: TokenService;
}

/** Builds a fully wired container and opens the database connection pool. */
export async function createContainer(config: AppConfig, clock?: Clock): Promise<Container> {
  const appClock = clock ?? new SystemClock(config.timeZone);
  const dataSource = await createDataSource(config.database).initialize();
  const repositories = createRepositories(dataSource.manager);

  const eventBus = new EventBus(logger);
  eventBus.subscribeToAll(new AuditLogSubscriber(logger));
  registerNotificationSubscribers(eventBus, logger);

  const unitOfWork = new TypeOrmUnitOfWork(dataSource, createRepositories, eventBus);
  const tokenService = new JwtTokenService(config.auth.jwtSecret, config.auth.tokenTtlSeconds);
  const passwordHasher = new BcryptPasswordHasher();

  const commandBus = new CommandBus(logger)
    .register(
      LoginCommand,
      new LoginHandler(repositories.users, passwordHasher, tokenService, eventBus),
    )
    .register(CreateVacationRequestCommand, new CreateVacationRequestHandler(unitOfWork, appClock))
    .register(UpdateVacationRequestCommand, new UpdateVacationRequestHandler(unitOfWork, appClock))
    .register(CancelVacationRequestCommand, new CancelVacationRequestHandler(unitOfWork))
    .register(ApproveVacationRequestCommand, new ApproveVacationRequestHandler(unitOfWork))
    .register(RejectVacationRequestCommand, new RejectVacationRequestHandler(unitOfWork))
    .register(PlanTeamVacationCommand, new PlanTeamVacationHandler(unitOfWork, appClock));

  const queryBus = new QueryBus(logger)
    .register(GetCurrentUserQuery, new GetCurrentUserHandler(repositories))
    .register(ListUsersQuery, new ListUsersHandler(repositories))
    .register(GetVacationRequestQuery, new GetVacationRequestHandler(repositories))
    .register(ListMyVacationRequestsQuery, new ListMyVacationRequestsHandler(repositories))
    .register(ListVacationRequestsQuery, new ListVacationRequestsHandler(repositories))
    .register(GetTeamMembersQuery, new GetTeamMembersHandler(repositories))
    .register(GetTeamCalendarQuery, new GetTeamCalendarHandler(repositories, appClock))
    .register(ListMyTeamPlansQuery, new ListMyTeamPlansHandler(repositories))
    .register(GetTeamPlanQuery, new GetTeamPlanHandler(repositories));

  return { config, dataSource, commandBus, queryBus, eventBus, tokenService };
}

let current: Promise<Container> | undefined;

/** Returns the process-wide container, creating it on first use (from the environment). */
export function getContainer(): Promise<Container> {
  current ??= createContainer(loadConfig()).catch((error: unknown) => {
    current = undefined; // allow a retry, e.g. once the database is reachable
    throw error;
  });
  return current;
}

/** Closes the database pool (graceful shutdown, end of tests). */
export async function disposeContainer(): Promise<void> {
  if (current) {
    const container = await current;
    current = undefined;
    await container.dataSource.destroy();
  }
}
