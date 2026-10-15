/**
 * HTTP handlers of the vacation request endpoints (mapped in root.yaml).
 *
 *   POST   /vacation-requests              Requester            -> CreateVacationRequestCommand
 *   GET    /me/vacation-requests           Requester            -> ListMyVacationRequestsQuery
 *   GET    /vacation-requests              Validator            -> ListVacationRequestsQuery
 *   GET    /vacation-requests/:id          owner or Validator   -> GetVacationRequestQuery
 *   PATCH  /vacation-requests/:id          owner (Requester)    -> UpdateVacationRequestCommand
 *   DELETE /vacation-requests/:id          owner (Requester)    -> CancelVacationRequestCommand
 *   PATCH  /vacation-requests/:id/status   Validator            -> Approve/RejectVacationRequestCommand
 *
 * Handlers stay thin: translate HTTP input into a command or query, dispatch it on a bus,
 * and translate the result into an HTTP response.
 */
import { getContainer } from '../../../bootstrap/container';
import { requirePrincipal } from '../../../http/authentication';
import {
  parseBody,
  parsePathId,
  parseQuery,
  readJsonBody,
  rejectReadOnlyFields,
  validate,
} from '../../../http/requestParsing';
import { created, noContent, ok } from '../../../http/responses';
import type { HttpHandler, InputParser } from '../../../http/types';
import { ApproveVacationRequestCommand } from '../application/commands/ApproveVacationRequestCommand';
import { CancelVacationRequestCommand } from '../application/commands/CancelVacationRequestCommand';
import { CreateVacationRequestCommand } from '../application/commands/CreateVacationRequestCommand';
import { RejectVacationRequestCommand } from '../application/commands/RejectVacationRequestCommand';
import { UpdateVacationRequestCommand } from '../application/commands/UpdateVacationRequestCommand';
import { GetVacationRequestQuery } from '../application/queries/GetVacationRequestQuery';
import { ListMyVacationRequestsQuery } from '../application/queries/ListMyVacationRequestsQuery';
import { ListVacationRequestsQuery } from '../application/queries/ListVacationRequestsQuery';
import { toVacationRequestDto } from '../application/vacationRequestDto';
import { VacationRequestStatus } from '../domain/VacationRequestStatus';
import type {
  ChangeStatusBody,
  CreateVacationRequestBody,
  ListMyVacationRequestsParams,
  ListVacationRequestsParams,
  UpdateVacationRequestBody,
} from './vacationRequestSchemas';
import {
  changeStatusBodySchema,
  createVacationRequestBodySchema,
  listMyVacationRequestsQuerySchema,
  listVacationRequestsQuerySchema,
  READ_ONLY_FIELDS,
  updateVacationRequestBodySchema,
} from './vacationRequestSchemas';

interface WithId<TBody = undefined> {
  readonly id: number;
  readonly body: TBody;
}

const locationOf = (id: number): string => `/vacation-requests/${id}`;

// --- POST /vacation-requests ----------------------------------------------------------------

export const parseCreateVacationRequest: InputParser<CreateVacationRequestBody> = (event) => {
  const body = readJsonBody(event);
  rejectReadOnlyFields(body, READ_ONLY_FIELDS);
  return validate(createVacationRequestBodySchema, body, 'request body');
};

export const createVacationRequest: HttpHandler<CreateVacationRequestBody> = async (
  body,
  context,
) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  const request = await commandBus.execute(
    new CreateVacationRequestCommand({
      requesterId: principal.id,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason ?? null,
    }),
  );
  return created(toVacationRequestDto(request), locationOf(request.id));
};

// --- GET /me/vacation-requests --------------------------------------------------------------

export const parseListMyVacationRequests: InputParser<ListMyVacationRequestsParams> = (event) =>
  parseQuery(event, listMyVacationRequestsQuerySchema);

export const listMyVacationRequests: HttpHandler<ListMyVacationRequestsParams> = async (
  params,
  context,
) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  const result = await queryBus.execute(
    new ListMyVacationRequestsQuery({
      userId: principal.id,
      status: params.status,
      sort: { sortBy: params.sortBy, sortOrder: params.sortOrder },
      page: { page: params.page, limit: params.limit },
    }),
  );
  return ok(result);
};

// --- GET /vacation-requests -----------------------------------------------------------------

export const parseListVacationRequests: InputParser<ListVacationRequestsParams> = (event) =>
  parseQuery(event, listVacationRequestsQuerySchema);

export const listVacationRequests: HttpHandler<ListVacationRequestsParams> = async (params) => {
  const { queryBus } = await getContainer();
  const result = await queryBus.execute(
    new ListVacationRequestsQuery({
      filter: {
        status: params.status,
        userId: params.userId,
        teamId: params.teamId,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      sort: { sortBy: params.sortBy, sortOrder: params.sortOrder },
      page: { page: params.page, limit: params.limit },
    }),
  );
  return ok(result);
};

// --- GET /vacation-requests/:id -------------------------------------------------------------

export const parseVacationRequestId: InputParser<number> = (event) => parsePathId(event);

export const getVacationRequest: HttpHandler<number> = async (id, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(
    await queryBus.execute(new GetVacationRequestQuery({ requestId: id, viewer: principal })),
  );
};

// --- PATCH /vacation-requests/:id -----------------------------------------------------------

export const parseUpdateVacationRequest: InputParser<WithId<UpdateVacationRequestBody>> = (
  event,
) => {
  const id = parsePathId(event);
  const body = readJsonBody(event);
  rejectReadOnlyFields(body, READ_ONLY_FIELDS);
  return { id, body: validate(updateVacationRequestBodySchema, body, 'request body') };
};

export const updateVacationRequest: HttpHandler<WithId<UpdateVacationRequestBody>> = async (
  { id, body },
  context,
) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  const request = await commandBus.execute(
    new UpdateVacationRequestCommand({
      requestId: id,
      requesterId: principal.id,
      version: body.version,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
    }),
  );
  return ok(toVacationRequestDto(request));
};

// --- DELETE /vacation-requests/:id ----------------------------------------------------------

export const cancelVacationRequest: HttpHandler<number> = async (id, context) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  await commandBus.execute(
    new CancelVacationRequestCommand({ requestId: id, requesterId: principal.id }),
  );
  return noContent();
};

// --- PATCH /vacation-requests/:id/status ----------------------------------------------------

export const parseChangeVacationRequestStatus: InputParser<WithId<ChangeStatusBody>> = (event) => ({
  id: parsePathId(event),
  body: parseBody(event, changeStatusBodySchema),
});

export const changeVacationRequestStatus: HttpHandler<WithId<ChangeStatusBody>> = async (
  { id, body },
  context,
) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  const decision = { requestId: id, validatorId: principal.id, version: body.version };
  const request =
    body.status === VacationRequestStatus.Approved
      ? await commandBus.execute(
          new ApproveVacationRequestCommand({ ...decision, comments: body.comments ?? null }),
        )
      : await commandBus.execute(
          new RejectVacationRequestCommand({ ...decision, comments: body.comments ?? '' }),
        );
  return ok(toVacationRequestDto(request));
};
