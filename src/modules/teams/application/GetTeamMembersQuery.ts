/**
 * GetTeamMembersQuery: the caller's team and its members (used to pick team plan participants).
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import { AuthenticationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { TeamDto } from '../../users/application/userDto';
import type { UserRole } from '../../users/domain/UserRole';

export interface TeamMemberDto {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly roles: UserRole[];
}

export interface TeamMembersDto {
  readonly team: TeamDto;
  readonly members: TeamMemberDto[];
}

export class GetTeamMembersQuery extends Query<{ readonly userId: number }, TeamMembersDto> {}

export class GetTeamMembersHandler implements QueryHandler<GetTeamMembersQuery, TeamMembersDto> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: GetTeamMembersQuery): Promise<TeamMembersDto> {
    const user = await this.repositories.users.findById(payload.userId);
    if (!user?.team) {
      throw new AuthenticationError(ErrorCode.InvalidToken, 'Your account no longer exists.');
    }
    const members = await this.repositories.users.findTeamMembers(user.teamId);
    return {
      team: { id: user.team.id, name: user.team.name },
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        roles: [...member.roles],
      })),
    };
  }
}
