/**
 * Input parsing and validation helpers used by every `x-inputParser`.
 *
 * Request bodies and query strings are validated with zod schemas. Unknown fields are
 * rejected (strict schemas), so typos and attempts to set read-only fields fail loudly
 * instead of being silently ignored.
 */
import { z } from 'zod';
import { ValidationError } from '../shared/errors/AppError';
import { ErrorCode } from '../shared/errors/ErrorCode';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../shared/persistence/pagination';
import type { CommonEvent } from './types';

/** Largest value of a PostgreSQL `integer` column. */
const MAX_DB_INTEGER = 2_147_483_647;

// ---------------------------------------------------------------------------
// Reusable schemas
// ---------------------------------------------------------------------------

/** A calendar day. Vacations are whole days, so any time component is rejected. */
export const isoDateSchema = z.iso.date({
  error: 'must be a calendar date in YYYY-MM-DD format (vacations are whole days, without time)',
});

/** A database id given as a JSON number. */
export const idSchema = z.number().int().positive().max(MAX_DB_INTEGER);

/** A database id given as a string (path and query parameters). */
export const idStringSchema = z
  .string()
  .regex(/^\d+$/, 'must be a positive integer')
  .transform(Number)
  .pipe(idSchema);

/** Optimistic-locking version sent by clients on updates. */
export const versionSchema = z.number().int().positive().max(MAX_DB_INTEGER);

/** Optional free text; blank strings are stored as null. */
export function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value));
}

/** `page` and `limit` query parameters. */
export const paginationShape = {
  page: z.coerce.number().int().min(1).max(MAX_DB_INTEGER).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Validates a value with a schema; on failure, throws a 400 listing every problem. */
export function validate<T>(schema: z.ZodType<T>, value: unknown, source: string): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || source,
    message: issue.message,
  }));
  const summary = issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
  throw new ValidationError(ErrorCode.ValidationError, `Invalid ${source}. ${summary}`, {
    issues,
  });
}

/** Parses the JSON body. An empty body is treated as `{}`. */
export function readJsonBody(event: CommonEvent): unknown {
  const raw =
    event.isBase64Encoded && event.body
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
  if (raw === null || raw === undefined || raw.trim() === '') {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError(ErrorCode.InvalidJson, 'The request body is not valid JSON.');
  }
}

/**
 * Rejects fields that clients may never set (rule 7: requesters cannot change the status).
 * Gives a clearer message than the generic "unrecognized key" error.
 */
export function rejectReadOnlyFields(body: unknown, readOnlyFields: readonly string[]): void {
  if (typeof body !== 'object' || body === null) {
    return;
  }
  const present = readOnlyFields.filter((field) => field in body);
  if (present.length > 0) {
    throw new ValidationError(
      ErrorCode.ReadOnlyField,
      `These fields cannot be set here: ${present.join(', ')}. ` +
        'The status and comments of a request can only be changed by a validator ' +
        '(PATCH /vacation-requests/:id/status).',
      { fields: present },
    );
  }
}

/** Parses and validates the JSON body. */
export function parseBody<T>(event: CommonEvent, schema: z.ZodType<T>): T {
  return validate(schema, readJsonBody(event), 'request body');
}

/** Parses and validates the query string. */
export function parseQuery<T>(event: CommonEvent, schema: z.ZodType<T>): T {
  return validate(schema, event.queryStringParameters ?? {}, 'query parameters');
}

/** Parses a numeric id path parameter (e.g. `:id`). */
export function parsePathId(event: CommonEvent, name = 'id'): number {
  return validate(idStringSchema, event.pathParameters?.[name] ?? '', `path parameter "${name}"`);
}
