/**
 * Raised when a requester changes the dates or reason of a Pending request.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { DateRange } from '../../../shared/time/calendarDate';

export interface VacationRequestUpdatedPayload {
  readonly requestId: number;
  readonly userId: number;
  readonly previousPeriod: DateRange;
  readonly newPeriod: DateRange;
}

export class VacationRequestUpdatedEvent extends DomainEvent<VacationRequestUpdatedPayload> {
  readonly eventName = 'VacationRequestUpdated';
}
