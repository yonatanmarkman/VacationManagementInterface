/**
 * LoginCommand: exchanges an email and password for a JWT access token.
 *
 * Unknown emails and wrong passwords produce the same error (and take about the same
 * time), so the endpoint does not reveal which emails are registered.
 */
import { Command } from '../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../shared/cqrs/Command';
import type { EventBus } from '../../../shared/cqrs/EventBus';
import { AuthenticationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { UserDto } from '../../users/application/userDto';
import { toUserDto } from '../../users/application/userDto';
import type { UserRepository } from '../../users/domain/UserRepository';
import type { PasswordHasher, TokenService } from '../domain/ports';
import { UserLoggedInEvent } from '../events/UserLoggedInEvent';

export interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
  readonly user: UserDto;
}

export class LoginCommand extends Command<LoginPayload, LoginResult> {}

export class LoginHandler implements CommandHandler<LoginCommand, LoginResult> {
  /** Hash compared against when the email is unknown, to keep response times uniform. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ payload }: LoginCommand): Promise<LoginResult> {
    const user = await this.users.findByEmailWithPassword(payload.email.trim().toLowerCase());
    const passwordHash = user?.password ?? (await this.getDummyHash());
    const passwordMatches = await this.passwordHasher.verify(payload.password, passwordHash);
    if (!user || !passwordMatches) {
      throw new AuthenticationError(ErrorCode.InvalidCredentials, 'Invalid email or password.');
    }

    const { accessToken, expiresInSeconds } = this.tokenService.issue({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      teamId: user.teamId,
    });
    await this.eventBus.publish([new UserLoggedInEvent({ userId: user.id })]);
    return { accessToken, tokenType: 'Bearer', expiresIn: expiresInSeconds, user: toUserDto(user) };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('not-a-real-password');
    return this.dummyHash;
  }
}
