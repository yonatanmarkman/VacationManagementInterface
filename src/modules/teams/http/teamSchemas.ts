/**
 * Input schemas of the team endpoints.
 */
import { z } from 'zod';
import { idSchema, isoDateSchema, optionalTextSchema } from '../../../http/requestParsing';
import { REASON_MAX_LENGTH } from '../../vacation-requests/http/vacationRequestSchemas';

export const MAX_TEAM_PLAN_PARTICIPANTS = 50;

export const teamCalendarQuerySchema = z.strictObject({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const planTeamVacationBodySchema = z.strictObject({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: optionalTextSchema(REASON_MAX_LENGTH),
  participantIds: z.array(idSchema).min(1).max(MAX_TEAM_PLAN_PARTICIPANTS),
});

export type TeamCalendarParams = z.infer<typeof teamCalendarQuerySchema>;
export type PlanTeamVacationBody = z.infer<typeof planTeamVacationBodySchema>;
