/**
 * Team endpoints: members, calendar and team vacation plans.
 */
import type {
  IsoDate,
  PageParams,
  Paginated,
  TeamCalendar,
  TeamMembers,
  TeamPlan,
} from '@/types/api';
import { http } from './http';

export interface TeamPlanInput {
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string | null;
  participantIds: number[];
}

export const teamApi = {
  async members(): Promise<TeamMembers> {
    return (await http.get<TeamMembers>('/me/team/members')).data;
  },

  async calendar(from: IsoDate, to: IsoDate): Promise<TeamCalendar> {
    return (await http.get<TeamCalendar>('/me/team/vacations', { params: { from, to } })).data;
  },

  async planVacation(input: TeamPlanInput): Promise<TeamPlan> {
    return (await http.post<TeamPlan>('/me/team/vacation-plans', input)).data;
  },

  /** Plans I proposed or take part in, newest first. */
  async listPlans(page: PageParams): Promise<Paginated<TeamPlan>> {
    return (await http.get<Paginated<TeamPlan>>('/me/team/vacation-plans', { params: page })).data;
  },
};
