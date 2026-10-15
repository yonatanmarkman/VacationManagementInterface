/**
 * JSON shapes used to expose users through the API, and the mappers that build them.
 * The password hash is never part of any DTO.
 */
import type { User } from '../domain/User';
import type { UserRole } from '../domain/UserRole';

export interface TeamDto {
  readonly id: number;
  readonly name: string;
}

/** Full user profile. */
export interface UserDto {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly roles: UserRole[];
  readonly team: TeamDto | null;
  readonly createdAt: string;
}

/** Short user description embedded in other resources. */
export interface UserSummaryDto {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly team: TeamDto | null;
}

export function toTeamDto(user: User): TeamDto | null {
  return user.team ? { id: user.team.id, name: user.team.name } : null;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: [...user.roles],
    team: toTeamDto(user),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toUserSummaryDto(user: User): UserSummaryDto {
  return { id: user.id, name: user.name, email: user.email, team: toTeamDto(user) };
}
