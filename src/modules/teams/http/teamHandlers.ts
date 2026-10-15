/**
 * HTTP handlers of the team endpoints (mapped in root.yaml).
 *
 *   GET  /me/team/members                any logged user -> GetTeamMembersQuery
 *   GET  /me/team/vacations              any logged user -> GetTeamCalendarQuery
 *   POST /me/team/vacation-plans         Requester       -> PlanTeamVacationCommand
 *   GET  /me/team/vacation-plans         Requester       -> ListMyTeamPlansQuery
 *   GET  /me/team/vacation-plans/:id     plan member or Validator -> GetTeamPlanQuery
 */
import { getContainer } from '../../../bootstrap/container';
import { requirePrincipal } from '../../../http/authentication';
import { parseBody, parsePathId, parseQuery } from '../../../http/requestParsing';
import { created, ok } from '../../../http/responses';
import type { HttpHandler, InputParser } from '../../../http/types';
import { GetTeamCalendarQuery } from '../application/GetTeamCalendarQuery';
import { GetTeamMembersQuery } from '../application/GetTeamMembersQuery';
import { GetTeamPlanQuery } from '../application/GetTeamPlanQuery';
import { ListMyTeamPlansQuery } from '../application/ListMyTeamPlansQuery';
import { PlanTeamVacationCommand } from '../application/PlanTeamVacationCommand';
import { toTeamPlanDto } from '../application/teamPlanDto';
import type { ListTeamPlansParams, PlanTeamVacationBody, TeamCalendarParams } from './teamSchemas';
import {
  listTeamPlansQuerySchema,
  planTeamVacationBodySchema,
  teamCalendarQuerySchema,
} from './teamSchemas';

const planLocation = (id: number): string => `/me/team/vacation-plans/${id}`;

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

export const planTeamVacation: HttpHandler<PlanTeamVacationBody> = async (body, context) => {
  const principal = requirePrincipal(context);
  const { commandBus } = await getContainer();
  const { plan, requests } = await commandBus.execute(
    new PlanTeamVacationCommand({
      proposerId: principal.id,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason ?? null,
      participantIds: body.participantIds,
    }),
  );
  return created(toTeamPlanDto(plan, requests, principal), planLocation(plan.id));
};

export const parseListTeamPlans: InputParser<ListTeamPlansParams> = (event) =>
  parseQuery(event, listTeamPlansQuerySchema);

export const listMyTeamPlans: HttpHandler<ListTeamPlansParams> = async (params, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(await queryBus.execute(new ListMyTeamPlansQuery({ viewer: principal, page: params })));
};

export const parseTeamPlanId: InputParser<number> = (event) => parsePathId(event);

export const getTeamPlan: HttpHandler<number> = async (planId, context) => {
  const principal = requirePrincipal(context);
  const { queryBus } = await getContainer();
  return ok(await queryBus.execute(new GetTeamPlanQuery({ planId, viewer: principal })));
};
