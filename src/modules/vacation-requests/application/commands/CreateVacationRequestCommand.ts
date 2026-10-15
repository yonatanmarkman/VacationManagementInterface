/**
 * CreateVacationRequestCommand: a requester submits a new vacation request.
 *
 * Flow: validate dates (rules 1, 5) -> check the user's existing requests (rules 2, 3)
 * -> insert as Pending -> raise VacationRequestCreatedEvent after commit.
 */
import { Command } from '../../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../../shared/cqrs/Command';
import type { UnitOfWork } from '../../../../shared/persistence/UnitOfWork';
import type { IsoDate } from '../../../../shared/time/calendarDate';
import type { Clock } from '../../../../shared/time/Clock';
import { VacationRequest } from '../../domain/VacationRequest';
import {
  assertNoSchedulingConflict,
  assertValidVacationPeriod,
} from '../../domain/vacationRequestRules';
import { VacationRequestCreatedEvent } from '../../events/VacationRequestCreatedEvent';
import { reloadRequest } from './reloadRequest';

export interface CreateVacationRequestPayload {
  readonly requesterId: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly reason: string | null;
}

export class CreateVacationRequestCommand extends Command<
  CreateVacationRequestPayload,
  VacationRequest
> {}

export class CreateVacationRequestHandler implements CommandHandler<
  CreateVacationRequestCommand,
  VacationRequest
> {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute({ payload }: CreateVacationRequestCommand): Promise<VacationRequest> {
    const period = { startDate: payload.startDate, endDate: payload.endDate };
    assertValidVacationPeriod(period, this.clock.today());

    return this.unitOfWork.run(async ({ repositories, raise }) => {
      const existing = await repositories.vacationRequests.findConflictCandidates(
        [payload.requesterId],
        period,
      );
      assertNoSchedulingConflict(period, existing);

      const saved = await repositories.vacationRequests.save(
        VacationRequest.submit({ userId: payload.requesterId, ...period, reason: payload.reason }),
      );
      raise(
        new VacationRequestCreatedEvent({
          requestId: saved.id,
          userId: saved.userId,
          ...period,
          proposedBy: null,
        }),
      );
      return reloadRequest(repositories, saved.id);
    });
  }
}
