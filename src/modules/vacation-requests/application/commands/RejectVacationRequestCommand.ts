/**
 * RejectVacationRequestCommand: a validator rejects a Pending request with a mandatory comment.
 *
 * Same concurrency guarantees as approval: row lock + version check. Validators cannot
 * reject their own requests.
 */
import { Command } from '../../../../shared/cqrs/Command';
import type { CommandHandler } from '../../../../shared/cqrs/Command';
import type { UnitOfWork } from '../../../../shared/persistence/UnitOfWork';
import { assertRejectionComment } from '../../domain/VacationRequest';
import type { VacationRequest } from '../../domain/VacationRequest';
import { VacationRequestRejectedEvent } from '../../events/VacationRequestRejectedEvent';
import { vacationRequestNotFound } from './loadOwnRequestForUpdate';
import { reloadRequest } from './reloadRequest';

export interface RejectVacationRequestPayload {
  readonly requestId: number;
  readonly validatorId: number;
  /** The version the validator last saw. */
  readonly version: number;
  readonly comments: string;
}

export class RejectVacationRequestCommand extends Command<
  RejectVacationRequestPayload,
  VacationRequest
> {}

export class RejectVacationRequestHandler implements CommandHandler<
  RejectVacationRequestCommand,
  VacationRequest
> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute({ payload }: RejectVacationRequestCommand): Promise<VacationRequest> {
    // Fail fast on invalid input, before touching the database.
    assertRejectionComment(payload.comments);

    return this.unitOfWork.run(async ({ repositories, raise }) => {
      const request = await repositories.vacationRequests.findByIdForUpdate(payload.requestId);
      if (!request) {
        throw vacationRequestNotFound(payload.requestId);
      }
      request.reject(payload.validatorId, payload.comments);
      request.assertVersion(payload.version);

      await repositories.vacationRequests.save(request);
      raise(
        new VacationRequestRejectedEvent({
          requestId: request.id,
          userId: request.userId,
          validatorId: payload.validatorId,
          startDate: request.startDate,
          endDate: request.endDate,
          comments: request.comments ?? '',
        }),
      );
      return reloadRequest(repositories, request.id);
    });
  }
}
