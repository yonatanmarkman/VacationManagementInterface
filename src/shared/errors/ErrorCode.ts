/**
 * Machine-readable error codes returned in every error response (`error.code`).
 *
 * Clients should branch on these codes, never on the human-readable message.
 */
export enum ErrorCode {
  // 400 - invalid input
  ValidationError = 'VALIDATION_ERROR',
  InvalidJson = 'INVALID_JSON',
  ReadOnlyField = 'READ_ONLY_FIELD',
  InvalidDateRange = 'INVALID_DATE_RANGE',
  StartDateNotInFuture = 'START_DATE_NOT_IN_FUTURE',
  RejectionCommentRequired = 'REJECTION_COMMENT_REQUIRED',
  InvalidParticipants = 'INVALID_PARTICIPANTS',

  // 401 - authentication
  AuthenticationRequired = 'AUTHENTICATION_REQUIRED',
  InvalidToken = 'INVALID_TOKEN',
  TokenExpired = 'TOKEN_EXPIRED',
  InvalidCredentials = 'INVALID_CREDENTIALS',

  // 403 - authorization
  Forbidden = 'FORBIDDEN',
  SelfDecisionForbidden = 'SELF_DECISION_FORBIDDEN',

  // 404 / 405 - routing and resources
  RouteNotFound = 'ROUTE_NOT_FOUND',
  MethodNotAllowed = 'METHOD_NOT_ALLOWED',
  VacationRequestNotFound = 'VACATION_REQUEST_NOT_FOUND',
  TeamPlanNotFound = 'TEAM_PLAN_NOT_FOUND',

  // 409 - conflicts with the current state
  VacationOverlap = 'VACATION_OVERLAP',
  DuplicateVacationRequest = 'DUPLICATE_VACATION_REQUEST',
  RequestNotPending = 'REQUEST_NOT_PENDING',
  VersionConflict = 'VERSION_CONFLICT',
  TeamPlanConflict = 'TEAM_PLAN_CONFLICT',
  ConcurrentModification = 'CONCURRENT_MODIFICATION',

  // 500
  InternalError = 'INTERNAL_ERROR',
}
