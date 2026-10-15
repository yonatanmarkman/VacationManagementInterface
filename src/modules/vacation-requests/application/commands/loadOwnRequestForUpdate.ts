/**
 * Shared helper for requester commands (update, cancel): locks the request row and
 * checks that it belongs to the caller.
 *
 * Someone else's request is reported as "not found" so requesters cannot discover
 * which request ids exist.
 */
import { NotFoundError } from '../../../../shared/errors/AppError';
import { ErrorCode } from '../../../../shared/errors/ErrorCode';
import type { Repositories } from '../../../../shared/persistence/UnitOfWork';
import type { VacationRequest } from '../../domain/VacationRequest';

export function vacationRequestNotFound(requestId: number): NotFoundError {
  return new NotFoundError(
    ErrorCode.VacationRequestNotFound,
    `Vacation request ${requestId} was not found.`,
  );
}

export async function loadOwnRequestForUpdate(
  repositories: Repositories,
  requestId: number,
  ownerId: number,
): Promise<VacationRequest> {
  const request = await repositories.vacationRequests.findByIdForUpdate(requestId);
  if (!request || !request.isOwnedBy(ownerId)) {
    throw vacationRequestNotFound(requestId);
  }
  return request;
}
