/**
 * Builders for entities used in unit tests.
 */
import { Team } from '../../../src/modules/teams/domain/Team';
import { User } from '../../../src/modules/users/domain/User';
import { UserRole } from '../../../src/modules/users/domain/UserRole';
import { VacationRequest } from '../../../src/modules/vacation-requests/domain/VacationRequest';
import { VacationRequestStatus } from '../../../src/modules/vacation-requests/domain/VacationRequestStatus';

export const TODAY = '2026-10-15';

export function makeTeam(id: number, name = `Team ${id}`): Team {
  return Object.assign(new Team(), { id, name, createdAt: new Date('2026-01-01T00:00:00Z') });
}

export function makeUser(
  id: number,
  overrides: Partial<Pick<User, 'name' | 'roles' | 'teamId'>> = {},
): User {
  const teamId = overrides.teamId ?? 1;
  return Object.assign(new User(), {
    id,
    name: overrides.name ?? `User ${id}`,
    email: `user${id}@example.com`,
    password: 'hash',
    roles: overrides.roles ?? [UserRole.Requester],
    teamId,
    team: makeTeam(teamId),
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });
}

export function makeRequest(
  overrides: Partial<
    Pick<
      VacationRequest,
      'id' | 'userId' | 'startDate' | 'endDate' | 'status' | 'comments' | 'version'
    >
  > = {},
): VacationRequest {
  const request = VacationRequest.submit({
    userId: overrides.userId ?? 1,
    startDate: overrides.startDate ?? '2026-11-10',
    endDate: overrides.endDate ?? '2026-11-12',
    reason: null,
  });
  return Object.assign(request, {
    id: overrides.id ?? 100,
    status: overrides.status ?? VacationRequestStatus.Pending,
    comments: overrides.comments ?? null,
    version: overrides.version ?? 1,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });
}
