/**
 * CancelVacationRequestCommand: a requester withdraws (deletes) their own Pending request.
 * Approved and Rejected requests are final and cannot be cancelled.
 */
import { Command } from '../../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../../shared/cqrs/Command';
import type { UnitOfWork } from '../../../../shared/persistence/UnitOfWork';
import { VacationRequestCancelledEvent } from '../../events/VacationRequestCancelledEvent';
import { loadOwnRequestForUpdate } from './loadOwnRequestForUpdate';

export interface CancelVacationRequestPayload {
  readonly requestId: number;
  readonly requesterId: number;
}

export class CancelVacationRequestCommand extends Command<CancelVacationRequestPayload, void> {}

export class CancelVacationRequestHandler implements CommandHandler<
  CancelVacationRequestCommand,
  void
> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute({ payload }: CancelVacationRequestCommand): Promise<void> {
    await this.unitOfWork.run(async ({ repositories, raise }) => {
      const request = await loadOwnRequestForUpdate(
        repositories,
        payload.requestId,
        payload.requesterId,
      );
      request.assertPending();

      const { id, userId, startDate, endDate } = request;
      await repositories.vacationRequests.remove(request);
      raise(new VacationRequestCancelledEvent({ requestId: id, userId, startDate, endDate }));
    });
  }
}
