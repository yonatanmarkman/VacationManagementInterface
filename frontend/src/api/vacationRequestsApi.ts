/**
 * Vacation request endpoints (requester and validator views).
 */
import type {
  IsoDate,
  PageParams,
  Paginated,
  SortField,
  SortOrder,
  VacationRequest,
  VacationRequestStatus,
} from '@/types/api';
import { http } from './http';

export interface VacationRequestInput {
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string | null;
}

export interface SortParams {
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface MyRequestsFilter {
  status?: VacationRequestStatus;
}

export interface AllRequestsFilter {
  status?: VacationRequestStatus;
  userId?: number;
  teamId?: number;
  startDate?: IsoDate;
  endDate?: IsoDate;
}

/** Removes empty values so they are not sent as query parameters. */
function compact(params: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export const vacationRequestsApi = {
  async create(input: VacationRequestInput): Promise<VacationRequest> {
    return (await http.post<VacationRequest>('/vacation-requests', input)).data;
  },

  async listMine(
    filter: MyRequestsFilter,
    page: PageParams,
    sort: SortParams = {},
  ): Promise<Paginated<VacationRequest>> {
    const params = compact({ ...filter, ...page, ...sort });
    return (await http.get<Paginated<VacationRequest>>('/me/vacation-requests', { params })).data;
  },

  async listAll(
    filter: AllRequestsFilter,
    page: PageParams,
    sort: SortParams = {},
  ): Promise<Paginated<VacationRequest>> {
    const params = compact({ ...filter, ...page, ...sort });
    return (await http.get<Paginated<VacationRequest>>('/vacation-requests', { params })).data;
  },

  async update(id: number, input: VacationRequestInput, version: number): Promise<VacationRequest> {
    return (await http.patch<VacationRequest>(`/vacation-requests/${id}`, { ...input, version }))
      .data;
  },

  async cancel(id: number): Promise<void> {
    await http.delete(`/vacation-requests/${id}`);
  },

  async approve(id: number, version: number, comments?: string): Promise<VacationRequest> {
    return (
      await http.patch<VacationRequest>(`/vacation-requests/${id}/status`, {
        status: 'Approved',
        version,
        ...(comments ? { comments } : {}),
      })
    ).data;
  },

  async reject(id: number, version: number, comments: string): Promise<VacationRequest> {
    return (
      await http.patch<VacationRequest>(`/vacation-requests/${id}/status`, {
        status: 'Rejected',
        version,
        comments,
      })
    ).data;
  },
};
