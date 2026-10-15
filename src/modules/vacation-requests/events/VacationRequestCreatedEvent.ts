/**
 * Raised when a vacation request is submitted (directly or as part of a team plan).
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { IsoDate } from '../../../shared/time/calendarDate';

export interface VacationRequestCreatedPayload {
  readonly requestId: number;
  readonly userId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  /** Set when the request was created by a teammate's team vacation plan. */
  readonly proposedBy: number | null;
}

export class VacationRequestCreatedEvent extends DomainEvent<VacationRequestCreatedPayload> {
  readonly eventName = 'VacationRequestCreated';
}
