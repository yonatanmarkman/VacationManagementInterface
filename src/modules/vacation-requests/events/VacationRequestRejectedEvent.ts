/**
 * Raised when a validator rejects a vacation request.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { IsoDate } from '../../../shared/time/calendarDate';

export interface VacationRequestRejectedPayload {
  readonly requestId: number;
  readonly userId: number;
  readonly validatorId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly comments: string;
}

export class VacationRequestRejectedEvent extends DomainEvent<VacationRequestRejectedPayload> {
  readonly eventName = 'VacationRequestRejected';
}
