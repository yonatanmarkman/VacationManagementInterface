/**
 * Unit tests for request validation (bodies, path ids, query strings) and for the error-to-HTTP mapping.
 */
import { toErrorResponse } from '../../../src/http/errorResponses';
import type { CommonEvent } from '../../../src/http/types';
import {
  parseChangeVacationRequestStatus,
  parseCreateVacationRequest,
  parseListVacationRequests,
  parseUpdateVacationRequest,
} from '../../../src/modules/vacation-requests/http/vacationRequestHandlers';
import {
  ConflictError,
  MethodNotAllowedError,
  ValidationError,
} from '../../../src/shared/errors/AppError';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';

const event = (overrides: Partial<CommonEvent>): CommonEvent => ({
  path: '/',
  method: 'POST',
  body: null,
  pathParameters: {},
  queryStringParameters: {},
  headers: {},
  version: 'commonEvent',
  ...overrides,
});
const withBody = (body: unknown, pathParameters = {}) =>
  event({ body: typeof body === 'string' ? body : JSON.stringify(body), pathParameters });

describe('request validation', () => {
  it('accepts a valid creation body and normalizes a blank reason to null', () => {
    expect(
      parseCreateVacationRequest(
        withBody({ startDate: '2026-12-01', endDate: '2026-12-02', reason: ' ' }),
      ),
    ).toEqual({ startDate: '2026-12-01', endDate: '2026-12-02', reason: null });
  });

  it.each([
    ['dates with a time component', { startDate: '2026-12-01T09:00:00Z', endDate: '2026-12-02' }],
    ['impossible dates', { startDate: '2026-02-30', endDate: '2026-03-02' }],
    ['a missing endDate', { startDate: '2026-12-01' }],
    ['unknown fields', { startDate: '2026-12-01', endDate: '2026-12-02', days: 2 }],
  ])('rejects %s', (_case, body) => {
    expect(() => parseCreateVacationRequest(withBody(body))).toThrow(ValidationError);
  });

  it('rejects malformed JSON with INVALID_JSON', () => {
    expect(() => parseCreateVacationRequest(withBody('{"startDate":'))).toThrow(
      expect.objectContaining({ code: ErrorCode.InvalidJson }),
    );
  });

  it('refuses status/comments from requesters (rule 7)', () => {
    expect(() =>
      parseCreateVacationRequest(
        withBody({ startDate: '2026-12-01', endDate: '2026-12-02', status: 'Approved' }),
      ),
    ).toThrow(expect.objectContaining({ code: ErrorCode.ReadOnlyField }));
    expect(() =>
      parseUpdateVacationRequest(withBody({ status: 'Approved', version: 1 }, { id: '5' })),
    ).toThrow(expect.objectContaining({ code: ErrorCode.ReadOnlyField }));
  });

  it('requires a version and at least one change when updating', () => {
    expect(() => parseUpdateVacationRequest(withBody({ reason: 'x' }, { id: '5' }))).toThrow(
      ValidationError,
    );
    expect(() => parseUpdateVacationRequest(withBody({ version: 1 }, { id: '5' }))).toThrow(
      ValidationError,
    );
  });

  it('validates path ids', () => {
    expect(() =>
      parseUpdateVacationRequest(withBody({ version: 1, reason: 'x' }, { id: 'abc' })),
    ).toThrow(ValidationError);
    expect(() =>
      parseUpdateVacationRequest(withBody({ version: 1, reason: 'x' }, { id: '99999999999' })),
    ).toThrow(ValidationError);
  });

  it('only accepts Approved or Rejected as a new status', () => {
    expect(
      parseChangeVacationRequestStatus(
        withBody({ status: 'Rejected', comments: 'Busy', version: 2 }, { id: '5' }),
      ),
    ).toEqual({ id: 5, body: { status: 'Rejected', comments: 'Busy', version: 2 } });
    expect(() =>
      parseChangeVacationRequestStatus(withBody({ status: 'Pending', version: 2 }, { id: '5' })),
    ).toThrow(ValidationError);
  });

  it('applies pagination defaults and limits', () => {
    expect(parseListVacationRequests(event({ queryStringParameters: {} }))).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(() =>
      parseListVacationRequests(event({ queryStringParameters: { limit: '101' } })),
    ).toThrow(ValidationError);
    expect(() =>
      parseListVacationRequests(
        event({ queryStringParameters: { startDate: '2026-12-10', endDate: '2026-12-01' } }),
      ),
    ).toThrow(ValidationError);
  });
});

describe('toErrorResponse', () => {
  it('maps application errors to their status code and a consistent body', () => {
    const response = toErrorResponse(new ConflictError(ErrorCode.VacationOverlap, 'Overlap'));
    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body as string)).toEqual({
      error: { code: 'VACATION_OVERLAP', message: 'Overlap' },
    });
  });

  it('sets the Allow header on 405', () => {
    const response = toErrorResponse(new MethodNotAllowedError('PUT', ['GET', 'POST']));
    expect(response.statusCode).toBe(405);
    expect(response.headers?.Allow).toBe('GET, POST');
  });

  it('hides unexpected errors behind a generic 500', () => {
    const response = toErrorResponse(new Error('connection string with password'));
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('password');
  });
});
