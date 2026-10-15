/**
 * GetVacationRequestQuery: returns one request with all its fields.
 *
 * Validators can read any request; requesters only their own. Someone else's request
 * is reported as "not found" so requesters cannot probe which ids exist.
 */
import { Query } from '../../../../shared/cqrs/Query';
import type { QueryHandler } from '../../../../shared/cqrs/Query';
import type { Repositories } from '../../../../shared/persistence/UnitOfWork';
import type { Principal } from '../../../auth/domain/Principal';
import { UserRole } from '../../../users/domain/UserRole';
import { vacationRequestNotFound } from '../commands/loadOwnRequestForUpdate';
import type { VacationRequestDto } from '../vacationRequestDto';
import { toVacationRequestDto } from '../vacationRequestDto';

export interface GetVacationRequestPayload {
  readonly requestId: number;
  readonly viewer: Principal;
}

export class GetVacationRequestQuery extends Query<GetVacationRequestPayload, VacationRequestDto> {}

export class GetVacationRequestHandler implements QueryHandler<
  GetVacationRequestQuery,
  VacationRequestDto
> {
  constructor(private readonly repositories: Repositories) {}

  async execute({ payload }: GetVacationRequestQuery): Promise<VacationRequestDto> {
    const { requestId, viewer } = payload;
    const request = await this.repositories.vacationRequests.findById(requestId);
    const canView =
      request !== null &&
      (request.isOwnedBy(viewer.id) || viewer.roles.includes(UserRole.Validator));
    if (!request || !canView) {
      throw vacationRequestNotFound(requestId);
    }
    return toVacationRequestDto(request);
  }
}
