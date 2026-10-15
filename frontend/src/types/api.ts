/**
 * Types of the backend API's JSON payloads. They mirror the backend DTOs
 * (src/modules/<module>/application) and the schemas documented in src/root.yaml.
 */

/** A calendar day, "YYYY-MM-DD". */
export type IsoDate = string;

export type UserRole = 'Requester' | 'Validator';

export type VacationRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Team {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
  team: Team | null;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  team: Team | null;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  /** Token lifetime in seconds. */
  expiresIn: number;
  user: User;
}

export interface VacationRequest {
  id: number;
  userId: number;
  user: UserSummary | null;
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string | null;
  status: VacationRequestStatus;
  comments: string | null;
  /** Set when the request was created by a team vacation plan. */
  teamPlan: { id: number; proposedBy: { id: number; name: string } } | null;
  /** Optimistic-locking version; send it back when updating or deciding. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface PageParams {
  page: number;
  limit: number;
}

export type SortField = 'createdAt' | 'startDate' | 'endDate';
export type SortOrder = 'asc' | 'desc';

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
}

export interface TeamMembers {
  team: Team;
  members: TeamMember[];
}

export interface TeamCalendarEntry {
  requestId: number;
  user: { id: number; name: string };
  startDate: IsoDate;
  endDate: IsoDate;
  status: Exclude<VacationRequestStatus, 'Rejected'>;
}

export interface TeamCalendar {
  team: Team;
  from: IsoDate;
  to: IsoDate;
  entries: TeamCalendarEntry[];
}

export interface TeamPlanParticipant {
  userId: number;
  name: string;
  requestId: number;
  status: VacationRequestStatus;
  /** Validator comment; null unless it concerns the viewer (or the viewer is a validator). */
  comments: string | null;
  isProposer: boolean;
}

export interface TeamPlan {
  id: number;
  proposedBy: { id: number; name: string };
  team: Team | null;
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string | null;
  createdAt: string;
  participants: TeamPlanParticipant[];
  /** Number of participants per status. */
  summary: Record<VacationRequestStatus, number>;
}

/** Error body returned by the API for every failed request. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
