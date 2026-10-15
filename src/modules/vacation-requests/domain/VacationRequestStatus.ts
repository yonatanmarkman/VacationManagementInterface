/**
 * Lifecycle of a vacation request: Pending -> Approved | Rejected (final).
 */
export enum VacationRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

/**
 * Statuses that "occupy" days on the calendar. A user's requests in these statuses
 * may not overlap (enforced by the `vacation_requests_no_overlap` DB constraint too).
 */
export const ACTIVE_STATUSES: readonly VacationRequestStatus[] = [
  VacationRequestStatus.Pending,
  VacationRequestStatus.Approved,
];
