/**
 * JSON shape used to expose vacation requests through the API.
 *
 * Owners and validators see every field (rule 8). `version` must be sent back
 * when updating or deciding on a request (optimistic locking).
 */
import type { IsoDate } from '../../../shared/time/calendarDate';
import type { UserSummaryDto } from '../../users/application/userDto';
import { toUserSummaryDto } from '../../users/application/userDto';
import type { VacationRequest } from '../domain/VacationRequest';
import type { VacationRequestStatus } from '../domain/VacationRequestStatus';

export interface VacationRequestDto {
  readonly id: number;
  readonly userId: number;
  readonly user: UserSummaryDto | null;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
  readonly status: VacationRequestStatus;
  readonly comments: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toVacationRequestDto(request: VacationRequest): VacationRequestDto {
  return {
    id: request.id,
    userId: request.userId,
    user: request.user ? toUserSummaryDto(request.user) : null,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    status: request.status,
    comments: request.comments,
    version: request.version,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
