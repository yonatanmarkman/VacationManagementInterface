/**
 * Helpers that build HTTP responses with CEF's Response class (which adds CORS headers).
 *
 * CEF's default `Access-Control-Allow-Methods` omits PATCH, so it is overridden here.
 */
import { Response } from 'commoneventframework';
import type { HttpResponse } from './types';

const COMMON_HEADERS = {
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Expose-Headers': 'Location',
  'Cache-Control': 'no-store',
};

/** Builds a JSON response. */
export function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): HttpResponse {
  return new Response(statusCode, body as object, { ...COMMON_HEADERS, ...headers });
}

/** 200 OK */
export function ok(body: unknown): HttpResponse {
  return jsonResponse(200, body);
}

/** 201 Created, optionally pointing at the new resource. */
export function created(body: unknown, location?: string): HttpResponse {
  return jsonResponse(201, body, location ? { Location: location } : {});
}

/** 204 No Content (empty body). */
export function noContent(): HttpResponse {
  return jsonResponse(204, undefined);
}
