/**
 * Test client for integration tests. Requests go through the real entry point
 * (src/index.ts -> CEF routing -> pipeline -> commands/queries -> PostgreSQL),
 * exactly like requests coming from CEF's local HTTP server.
 */
import type { Context } from 'commoneventframework';
import { disposeContainer, getContainer } from '../../../src/bootstrap/container';
import { seedDatabase } from '../../../src/infrastructure/database/seed/seedDatabase';
import { DEMO_PASSWORD } from '../../../src/infrastructure/database/seed/seedData';
import { handler } from '../../../src/index';
import type { IsoDate } from '../../../src/shared/time/calendarDate';
import { addDays } from '../../../src/shared/time/calendarDate';
import { SystemClock } from '../../../src/shared/time/Clock';

/** Seeded demo users used by the tests. */
export const USERS = {
  requester: 'noa.levi@example.com', // Engineering, Requester
  teammate: 'daniel.cohen@example.com', // Engineering, Requester
  teammate2: 'maya.friedman@example.com', // Engineering, Requester
  teammate3: 'liam.katz@example.com', // Engineering, Requester
  otherTeamRequester: 'itai.golan@example.com', // Marketing, Requester
  validator: 'sarah.mizrahi@example.com', // Engineering, Validator
  secondValidator: 'michael.azoulay@example.com', // Reservations, Validator
  dualRole: 'david.benami@example.com', // Engineering, Requester + Validator
} as const;

export interface ApiResponse<T = any> {
  readonly status: number;
  readonly body: T;
  readonly headers: Record<string, unknown>;
}

interface CallOptions {
  readonly token?: string;
  readonly body?: unknown;
  readonly query?: Record<string, string>;
}

export async function call<T = any>(
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<ApiResponse<T>> {
  const event = {
    path,
    method,
    body: options.body === undefined ? null : JSON.stringify(options.body),
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    queryStringParameters: options.query ?? {},
    pathParameters: {},
    version: 'commonEvent',
  };
  const response = await handler(event, {} as Context);
  const raw = typeof response.body === 'string' ? response.body : '';
  return {
    status: response.statusCode ?? 0,
    body: raw ? JSON.parse(raw) : undefined,
    headers: (response.headers ?? {}) as Record<string, unknown>,
  };
}

/** Today's date in the application timezone. */
export async function today(): Promise<IsoDate> {
  const { config } = await getContainer();
  return new SystemClock(config.timeZone).today();
}

/** A date far enough in the future not to collide with seeded requests (which stay within ~95 days). */
export async function futureDate(offsetDays: number): Promise<IsoDate> {
  return addDays(await today(), 200 + offsetDays);
}

/** Restores the demo data set. */
export async function resetData(): Promise<void> {
  const { dataSource } = await getContainer();
  await seedDatabase(dataSource, await today());
}

const tokenCache = new Map<string, string>();

/** Logs in as a seeded user (tokens stay valid across data resets: ids are deterministic). */
export async function loginAs(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) {
    return cached;
  }
  const response = await call('POST', '/auth/login', { body: { email, password: DEMO_PASSWORD } });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(response.body)}`);
  }
  tokenCache.set(email, response.body.accessToken);
  return response.body.accessToken;
}

/** Looks up a seeded user's id by email. */
export async function userIdOf(email: string): Promise<number> {
  const { dataSource } = await getContainer();
  const rows: { id: number }[] = await dataSource.query('SELECT id FROM users WHERE email = $1', [
    email,
  ]);
  return rows[0].id;
}

export async function closeApp(): Promise<void> {
  await disposeContainer();
}
