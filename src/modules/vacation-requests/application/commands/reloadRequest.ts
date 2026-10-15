/**
 * Shared helper for command handlers: re-reads a request (with its user and team)
 * inside the current transaction, so the response reflects exactly what was stored.
 */
import type { Repositories } from '../../../../shared/persistence/UnitOfWork';
import type { VacationRequest } from '../../domain/VacationRequest';

export async function reloadRequest(
  repositories: Repositories,
  requestId: number,
): Promise<VacationRequest> {
  const request = await repositories.vacationRequests.findById(requestId);
  if (!request) {
    throw new Error(`Vacation request ${requestId} disappeared inside its own transaction`);
  }
  return request;
}
