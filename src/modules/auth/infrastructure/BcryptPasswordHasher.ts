/**
 * PasswordHasher implementation using bcrypt (pure-JS `bcryptjs`, no native build needed).
 */
import { compare, hash } from 'bcryptjs';
import type { PasswordHasher } from '../domain/ports';

const COST_FACTOR = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainText: string): Promise<string> {
    return hash(plainText, COST_FACTOR);
  }

  verify(plainText: string, passwordHash: string): Promise<boolean> {
    return compare(plainText, passwordHash);
  }
}
