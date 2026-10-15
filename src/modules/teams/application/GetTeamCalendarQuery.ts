/**
 * GetTeamCalendarQuery: who in the caller's team is away (Pending or Approved) in a date window.
 *
 * Only names, dates and status are exposed; reasons and validator comments stay private
 * to the owner and validators. Defaults: from = today, to = from + 90 days. Max window: 366 days.
 */
import { Query } from '../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../shared/cqrs/Query';
import { AuthenticationError, ValidationError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/ErrorCode';
import type { Repositories } from '../../../shared/persistence/UnitOfWork';
import type { IsoDate } from '../../../shared/time/calendarDate';
import { addDays, daysBetween } from '../../../shared/time/calendarDate';
import type { Clock } from '../../../shared/time/Clock';
import type { TeamDto } from '../../users/application/userDto';
import type { VacationRequestStatus } from '../../vacation-requests/domain/VacationRequestStatus';

export const DEFAULT_CALENDAR_WINDOW_DAYS = 90;
export const MAX_CALENDAR_WINDOW_DAYS = 366;

export interface TeamCalendarEntryDto {
  readonly requestId: number;
  readonly user: { readonly id: number; readonly name: string };
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly status: VacationRequestStatus;
}

export interface TeamCalendarDto {
  readonly team: TeamDto;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly entries: TeamCalendarEntryDto[];
}

export interface GetTeamCalendarPayload {
  readonly userId: number;
  readonly from?: IsoDate;
  readonly to?: IsoDate;
}

export class GetTeamCalendarQuery extends Query<GetTeamCalendarPayload, TeamCalendarDto> {}

export class GetTeamCalendarHandler implements QueryHandler<GetTeamCalendarQuery, TeamCalendarDto> {
  constructor(
    private readonly repositories: Repositories,
    private readonly clock: Clock,
  ) {}

  async execute({ payload }: GetTeamCalendarQuery): Promise<TeamCalendarDto> {
    const from = payload.from ?? this.clock.today();
    const to = payload.to ?? addDays(from, DEFAULT_CALENDAR_WINDOW_DAYS);
    if (to < from) {
      throw new ValidationError(ErrorCode.InvalidDateRange, '"to" must be on or after "from".');
    }
    if (daysBetween(from, to) > MAX_CALENDAR_WINDOW_DAYS) {
      throw new ValidationError(
        ErrorCode.InvalidDateRange,
        `The calendar window cannot exceed ${MAX_CALENDAR_WINDOW_DAYS} days.`,
      );
    }

    const user = await this.repositories.users.findById(payload.userId);
    if (!user?.team) {
      throw new AuthenticationError(ErrorCode.InvalidToken, 'Your account no longer exists.');
    }
    const requests = await this.repositories.vacationRequests.findTeamCalendar(user.teamId, {
      startDate: from,
      endDate: to,
    });
    return {
      team: { id: user.team.id, name: user.team.name },
      from,
      to,
      entries: requests.map((request) => ({
        requestId: request.id,
        user: { id: request.userId, name: request.user?.name ?? '' },
        startDate: request.startDate,
        endDate: request.endDate,
        status: request.status,
      })),
    };
  }
}
