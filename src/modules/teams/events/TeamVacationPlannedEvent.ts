/**
 * Raised when a requester plans a team vacation: one Pending request was created per participant.
 */
import { DomainEvent } from '../../../shared/cqrs/DomainEvent';
import type { IsoDate } from '../../../shared/time/calendarDate';

export interface TeamVacationPlannedPayload {
  readonly planId: number;
  readonly proposerId: number;
  readonly teamId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly participantIds: readonly number[];
  readonly requestIds: readonly number[];
}

export class TeamVacationPlannedEvent extends DomainEvent<TeamVacationPlannedPayload> {
  readonly eventName = 'TeamVacationPlanned';
}
