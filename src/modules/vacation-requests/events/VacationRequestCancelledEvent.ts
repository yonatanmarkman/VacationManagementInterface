/**
 * Raised when a requester cancels (deletes) one of their Pending requests.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { IsoDate } from '../../../shared/time/calendarDate';

export interface VacationRequestCancelledPayload {
  readonly requestId: number;
  readonly userId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
}

export class VacationRequestCancelledEvent extends DomainEvent<VacationRequestCancelledPayload> {
  readonly eventName = 'VacationRequestCancelled';
}
