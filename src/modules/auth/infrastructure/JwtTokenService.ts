/**
 * TokenService implementation using signed JWTs (HS256).
 *
 * The token carries the user's id (`sub`), name, email, roles and team, so protected
 * routes can authorize requests without a database round trip.
 */
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import { ALL_USER_ROLES, type UserRole } from '../../users/domain/UserRole';
import type { Principal } from '../domain/Principal';
import type { TokenService } from '../domain/ports';

const ISSUER = 'vacation-management-api';
const ALGORITHM = 'HS256';

interface AccessTokenClaims {
  sub: string;
  name: string;
  email: string;
  roles: UserRole[];
  teamId: number;
}

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  issue(principal: Principal): { accessToken: string; expiresInSeconds: number } {
    const claims: AccessTokenClaims = {
      sub: String(principal.id),
      name: principal.name,
      email: principal.email,
      roles: [...principal.roles],
      teamId: principal.teamId,
    };
    const accessToken = jwt.sign(claims, this.secret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      expiresIn: this.ttlSeconds,
    });
    return { accessToken, expiresInSeconds: this.ttlSeconds };
  }

  verify(accessToken: string): Principal {
    let decoded: unknown;
    try {
      decoded = jwt.verify(accessToken, this.secret, { algorithms: [ALGORITHM], issuer: ISSUER });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError(
          ErrorCode.TokenExpired,
          'The access token has expired. Log in again.',
        );
      }
      throw new AuthenticationError(ErrorCode.InvalidToken, 'The access token is invalid.');
    }
    return toPrincipal(decoded);
  }
}

function toPrincipal(decoded: unknown): Principal {
  const claims = decoded as Partial<AccessTokenClaims>;
  const id = Number(claims.sub);
  const rolesAreValid =
    Array.isArray(claims.roles) && claims.roles.every((role) => ALL_USER_ROLES.includes(role));
  if (
    !Number.isInteger(id) ||
    typeof claims.name !== 'string' ||
    typeof claims.email !== 'string' ||
    typeof claims.teamId !== 'number' ||
    !rolesAreValid
  ) {
    throw new AuthenticationError(ErrorCode.InvalidToken, 'The access token is invalid.');
  }
  return {
    id,
    name: claims.name,
    email: claims.email,
    roles: claims.roles as UserRole[],
    teamId: claims.teamId,
  };
}
