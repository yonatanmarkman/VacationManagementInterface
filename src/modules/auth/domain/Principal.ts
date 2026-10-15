/**
 * The authenticated caller, as decoded from the JWT access token.
 */
import type { UserRole } from '../../users/domain/UserRole';

export interface Principal {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly UserRole[];
  readonly teamId: number;
}
