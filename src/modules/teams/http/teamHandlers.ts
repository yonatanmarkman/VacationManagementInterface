/**
 * HTTP handlers of the team endpoints (mapped in root.yaml).
 *
 *   GET  /me/team/members          any logged user -> GetTeamMembersQuery
 *   GET  /me/team/vacations        any logged user -> GetTeamCalendarQuery
 *   POST /me/team/vacation-plans   Requester       -> PlanTeamVacationCommand
 */
import { getContainer } from '../../../bootstrap/container';
import { requirePrincipal } from '../../../http/authentication';
import { parseBody, parseQuery } from '../../../http/requestParsing';
import { created, ok } from '../../../http/responses';
import type { HttpHandler, InputParser } from '../../../http/types';
import { toVacationRequestDto } from '../../vacation-requests/application/vacationRequestDto';
import { GetTeamCalendarQuery } from '../application/GetTeamCalendarQuery';
import { GetTeamMembersQuery } from '../application/GetTeamMembersQuery';
import { PlanTeamVacationCommand } from '../application/PlanTeamVacationCommand';
import type { PlanTeamVacationBody, TeamCalendarParams } from './teamSchemas';
import { planTeamVacationBodySchema, teamCalendarQuerySchema } from './teamSchemas';

export const getTeamMembers: HttpHandler = async (_input, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(await queryBus.execute(new GetTeamMembersQuery({ userId: principal.id })));
};

export const parseTeamCalendar: InputParser<TeamCalendarParams> = (event) =>
  parseQuery(event, teamCalendarQuerySchema);

export const getTeamCalendar: HttpHandler<TeamCalendarParams> = async (params, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(
    await queryBus.execute(
      new GetTeamCalendarQuery({ userId: principal.id, from: params.from, to: params.to }),
    ),
  );
};

export const parsePlanTeamVacation: InputParser<PlanTeamVacationBody> = (event) =>
  parseBody(event, planTeamVacationBodySchema);

/**
 * Plans are not stored as a separate resource: the created resources are the individual
 * vacation requests, returned in the body (there is therefore no Location header).
 */
export const planTeamVacation: HttpHandler<PlanTeamVacationBody> = async (body, context) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  const requests = await commandBus.execute(
    new PlanTeamVacationCommand({
      proposerId: principal.id,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason ?? null,
      participantIds: body.participantIds,
    }),
  );
  return created({
    proposedBy: { id: principal.id, name: principal.name },
    startDate: body.startDate,
    endDate: body.endDate,
    requests: requests.map(toVacationRequestDto),
  });
};
