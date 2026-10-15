/**
 * GetCurrentUserQuery: the authenticated user's profile, read fresh from the database.
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import { AuthenticationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { UserDto } from '../../users/application/userDto';
import { toUserDto } from '../../users/application/userDto';

export class GetCurrentUserQuery extends Query<{ readonly userId: number }, UserDto> {}

export class GetCurrentUserHandler implements QueryHandler<GetCurrentUserQuery, UserDto> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: GetCurrentUserQuery): Promise<UserDto> {
    const user = await this.repositories.users.findById(payload.userId);
    if (!user) {
      throw new AuthenticationError(ErrorCode.InvalidToken, 'Your account no longer exists.');
    }
    return toUserDto(user);
  }
}
