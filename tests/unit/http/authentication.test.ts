/**
 * Unit tests for JWT authentication (valid, malformed, forged and expired tokens) and role checks.
 */
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../../../src/http/authentication';
import type { CommonEvent } from '../../../src/http/types';
import type { Principal } from '../../../src/modules/auth/domain/Principal';
import { JwtTokenService } from '../../../src/modules/auth/infrastructure/JwtTokenService';
import { UserRole } from '../../../src/modules/users/domain/UserRole';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';

const SECRET = 'unit-test-secret-0123456789-abcdefghijklmnop';
const tokens = new JwtTokenService(SECRET, 3600);
const principal: Principal = {
  id: 7,
  name: 'Noa',
  email: 'noa@example.com',
  roles: [UserRole.Requester],
  teamId: 1,
};

const eventWithAuth = (authorization?: string): CommonEvent => ({
  path: '/auth/me',
  method: 'GET',
  body: null,
  pathParameters: {},
  queryStringParameters: {},
  headers: authorization ? { Authorization: authorization } : {},
  version: 'commonEvent',
});

describe('authenticate', () => {
  it('returns the principal of a valid bearer token (header name is case-insensitive)', () => {
    const { accessToken } = tokens.issue(principal);
    expect(authenticate(eventWithAuth(`Bearer ${accessToken}`), tokens)).toEqual(principal);
  });

  it.each([
    [undefined, ErrorCode.AuthenticationRequired],
    ['Basic abc', ErrorCode.InvalidToken],
    ['Bearer not-a-jwt', ErrorCode.InvalidToken],
  ])('rejects authorization header %p', (header, code) => {
    expect(() => authenticate(eventWithAuth(header), tokens)).toThrow(
      expect.objectContaining({ code }),
    );
  });

  it('rejects tokens signed with another secret', () => {
    const forged = new JwtTokenService('another-secret-0123456789-abcdefghijklmno', 3600);
    const { accessToken } = forged.issue({ ...principal, roles: [UserRole.Validator] });
    expect(() => authenticate(eventWithAuth(`Bearer ${accessToken}`), tokens)).toThrow(
      expect.objectContaining({ code: ErrorCode.InvalidToken }),
    );
  });

  it('reports expired tokens with a dedicated code', () => {
    const expired = jwt.sign(
      { sub: '7', name: 'Noa', email: 'noa@example.com', roles: ['Requester'], teamId: 1 },
      SECRET,
      { algorithm: 'HS256', issuer: 'vacation-management-api', expiresIn: -10 },
    );
    expect(() => authenticate(eventWithAuth(`Bearer ${expired}`), tokens)).toThrow(
      expect.objectContaining({ code: ErrorCode.TokenExpired }),
    );
  });
});

describe('authorize', () => {
  it('allows callers holding one of the roles', () => {
    expect(() => authorize(principal, [UserRole.Requester, UserRole.Validator])).not.toThrow();
    expect(() => authorize(principal, [])).not.toThrow();
  });

  it('forbids callers without the role (403)', () => {
    expect(() => authorize(principal, [UserRole.Validator])).toThrow(
      expect.objectContaining({ code: ErrorCode.Forbidden }),
    );
  });
});
