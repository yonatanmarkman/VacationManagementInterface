/**
 * Domain events: facts about something that already happened (e.g. VacationRequestApprovedEvent).
 *
 * Events are raised by command handlers and published on the EventBus only after
 * the transaction commits, so subscribers never observe changes that were rolled back.
 */
import { randomUUID } from 'node:crypto';

export abstract class DomainEvent<TPayload extends object = object> {
  /** Stable event name used in logs (e.g. "VacationRequestApproved"). */
  abstract readonly eventName: string;
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(readonly payload: Readonly<TPayload>) {}
}
