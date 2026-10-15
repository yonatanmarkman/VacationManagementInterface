/**
 * The single Axios instance used by every API module.
 *
 * - Requests go to `/api/...`, which Vite proxies to the backend.
 * - The access token of the current session is attached automatically.
 * - Every failure is converted into an `ApiError` with a readable message.
 * - A 401 on an authenticated call ends the session (handler registered in main.ts).
 */
import axios, { type AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';

/** An API failure, normalized from the backend's `{ error: { code, message, details } }` body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Returns a user-friendly message for any thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Sets (or clears) the token sent with every request. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Registers what to do when the session is no longer valid (e.g. go back to login). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const response = error.response;
    if (!response) {
      return Promise.reject(
        new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the API running?'),
      );
    }
    if (response.status === 401 && accessToken) {
      onUnauthorized?.();
    }
    const body = response.data?.error;
    return Promise.reject(
      new ApiError(
        response.status,
        body?.code ?? 'UNKNOWN_ERROR',
        body?.message ?? `Request failed (HTTP ${response.status}).`,
        body?.details,
      ),
    );
  },
);
