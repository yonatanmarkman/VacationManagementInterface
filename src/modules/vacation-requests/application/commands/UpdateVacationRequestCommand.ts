/**
 * UpdateVacationRequestCommand: a requester changes the dates and/or reason of their own
 * Pending request.
 *
 * Every rule is checked again on the resulting request. The row is locked for the
 * duration of the transaction, and `version` must match the stored version
 * (optimistic locking), so a stale edit can never overwrite a newer change.
 */
import { Command } from '../../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../../shared/cqrs/Command';
import type { UnitOfWork } from '../../../../shared/persistence/UnitOfWork';
import type { IsoDate } from '../../../../shared/time/calendarDate';
import type { Clock } from '../../../../shared/time/Clock';
import type { VacationRequest } from '../../domain/VacationRequest';
import {
  assertNoSchedulingConflict,
  assertValidVacationPeriod,
} from '../../domain/vacationRequestRules';
import { VacationRequestUpdatedEvent } from '../../events/VacationRequestUpdatedEvent';
import { loadOwnRequestForUpdate } from './loadOwnRequestForUpdate';
import { reloadRequest } from './reloadRequest';

export interface UpdateVacationRequestPayload {
  readonly requestId: number;
  readonly requesterId: number;
  /** The version the requester last saw. */
  readonly version: number;
  /** Fields left undefined keep their current value. `reason: null` clears the reason. */
  readonly startDate?: IsoDate;
  readonly endDate?: IsoDate;
  readonly reason?: string | null;
}

export class UpdateVacationRequestCommand extends Command<
  UpdateVacationRequestPayload,
  VacationRequest
> {}

export class UpdateVacationRequestHandler implements CommandHandler<
  UpdateVacationRequestCommand,
  VacationRequest
> {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute({ payload }: UpdateVacationRequestCommand): Promise<VacationRequest> {
    return this.unitOfWork.run(async ({ repositories, raise }) => {
      const request = await loadOwnRequestForUpdate(
        repositories,
        payload.requestId,
        payload.requesterId,
      );
      request.assertPending();
      request.assertVersion(payload.version);

      const previousPeriod = request.period;
      const newPeriod = {
        startDate: payload.startDate ?? request.startDate,
        endDate: payload.endDate ?? request.endDate,
      };
      assertValidVacationPeriod(newPeriod, this.clock.today());
      const existing = await repositories.vacationRequests.findConflictCandidates(
        [request.userId],
        newPeriod,
        request.id,
      );
      assertNoSchedulingConflict(newPeriod, existing);

      request.reschedule({
        period: newPeriod,
        reason: payload.reason === undefined ? request.reason : payload.reason,
      });
      await repositories.vacationRequests.save(request);
      raise(
        new VacationRequestUpdatedEvent({
          requestId: request.id,
          userId: request.userId,
          previousPeriod,
          newPeriod,
        }),
      );
      return reloadRequest(repositories, request.id);
    });
  }
}
