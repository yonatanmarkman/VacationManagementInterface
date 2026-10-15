/**
 * Names of database constraints that enforce business rules.
 *
 * Shared by the migration that creates them and by the error translator that turns
 * their violations into domain errors, so the two can never drift apart.
 */
export const DbConstraint = {
  /** Rule 2: a user's Pending/Approved requests cannot overlap (exclusion constraint). */
  NoOverlap: 'vacation_requests_no_overlap',
  /** Rule 3: a user cannot request the exact same dates twice. */
  UniqueUserDates: 'vacation_requests_user_dates_unique',
  /** Rule 1: end_date >= start_date. */
  DatesOrdered: 'vacation_requests_dates_check',
  /** Rule 6: a rejected request has a non-blank comment. */
  RejectionComment: 'vacation_requests_rejection_comment_check',
} as const;
