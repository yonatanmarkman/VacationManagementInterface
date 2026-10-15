/**
 * Raised when a user logs in successfully.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';

export interface UserLoggedInPayload {
  readonly userId: number;
}

export class UserLoggedInEvent extends DomainEvent<UserLoggedInPayload> {
  readonly eventName = 'UserLoggedIn';
}
