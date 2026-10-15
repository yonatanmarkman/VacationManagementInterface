/**
 * Ports (interfaces) the auth module depends on; implementations live in ../infrastructure.
 */
import type { Principal } from './Principal';

/** Issues and verifies access tokens. */
export interface TokenService {
  issue(principal: Principal): { accessToken: string; expiresInSeconds: number };
  /** Returns the principal encoded in a valid token; throws AuthenticationError otherwise. */
  verify(accessToken: string): Principal;
}

/** Hashes and verifies passwords. */
export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, hash: string): Promise<boolean>;
}
