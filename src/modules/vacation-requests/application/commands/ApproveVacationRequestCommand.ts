/**
 * ApproveVacationRequestCommand: a validator approves a Pending request.
 *
 * The row is locked (SELECT ... FOR UPDATE), so when two validators decide at the same
 * time, the second one waits, then sees the request is no longer Pending and gets a 409.
 * Validators cannot approve their own requests.
 */
import { Command } from '../../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../../shared/cqrs/Command';
import type { UnitOfWork } from '../../../../shared/persistence/UnitOfWork';
import type { VacationRequest } from '../../domain/VacationRequest';
import { VacationRequestApprovedEvent } from '../../events/VacationRequestApprovedEvent';
import { vacationRequestNotFound } from './loadOwnRequestForUpdate';
import { reloadRequest } from './reloadRequest';

export interface ApproveVacationRequestPayload {
  readonly requestId: number;
  readonly validatorId: number;
  /** The version the validator last saw. */
  readonly version: number;
  readonly comments: string | null;
}

export class ApproveVacationRequestCommand extends Command<
  ApproveVacationRequestPayload,
  VacationRequest
> {}

export class ApproveVacationRequestHandler implements CommandHandler<
  ApproveVacationRequestCommand,
  VacationRequest
> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute({ payload }: ApproveVacationRequestCommand): Promise<VacationRequest> {
    return this.unitOfWork.run(async ({ repositories, raise }) => {
      const request = await repositories.vacationRequests.findByIdForUpdate(payload.requestId);
      if (!request) {
        throw vacationRequestNotFound(payload.requestId);
      }
      request.approve(payload.validatorId, payload.comments);
      request.assertVersion(payload.version);

      await repositories.vacationRequests.save(request);
      raise(
        new VacationRequestApprovedEvent({
          requestId: request.id,
          userId: request.userId,
          validatorId: payload.validatorId,
          startDate: request.startDate,
          endDate: request.endDate,
          comments: request.comments,
        }),
      );
      return reloadRequest(repositories, request.id);
    });
  }
}
