/**
 * Roles a user can hold. A user may hold both roles at once.
 */
export enum UserRole {
  /** Submits and manages their own vacation requests. */
  Requester = 'Requester',
  /** Reviews, approves and rejects vacation requests of other users. */
  Validator = 'Validator',
}

export const ALL_USER_ROLES: readonly UserRole[] = Object.values(UserRole);
