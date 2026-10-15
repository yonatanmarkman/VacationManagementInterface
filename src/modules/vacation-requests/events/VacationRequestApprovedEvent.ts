/**
 * Raised when a validator approves a vacation request.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { IsoDate } from '../../../shared/time/calendarDate';

export interface VacationRequestApprovedPayload {
  readonly requestId: number;
  readonly userId: number;
  readonly validatorId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly comments: string | null;
}

export class VacationRequestApprovedEvent extends DomainEvent<VacationRequestApprovedPayload> {
  readonly eventName = 'VacationRequestApproved';
}
