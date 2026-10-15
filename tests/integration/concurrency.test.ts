/**
 * Concurrency: many users writing at the same time.
 *
 * Each scenario fires requests in parallel. They run as concurrent PostgreSQL transactions
 * (one pooled connection each), so the application-level checks really do race, and the
 * database constraints, row locks and version checks must decide the winner.
 */
import { getContainer } from '../../src/bootstrap/container';
import { call, closeApp, futureDate, loginAs, resetData, USERS, userIdOf } from './support/testApi';

beforeEach(resetData);
afterAll(closeApp);

const statuses = (responses: { status: number }[]) => responses.map((r) => r.status);
const count = (values: number[], value: number) => values.filter((v) => v === value).length;

async function activeRequestsOf(email: string): Promise<number> {
  const { dataSource } = await getContainer();
  const rows: { count: string }[] = await dataSource.query(
    `SELECT count(*) FROM vacation_requests vr JOIN users u ON u.id = vr.user_id
     WHERE u.email = $1 AND vr.status IN ('Pending', 'Approved') AND vr.start_date >= $2`,
    [email, await futureDate(0)],
  );
  return Number(rows[0].count);
}

it('accepts exactly one of 10 identical submissions sent at once', async () => {
  const token = await loginAs(USERS.requester);
  const body = { startDate: await futureDate(0), endDate: await futureDate(4) };

  const responses = await Promise.all(
    Array.from({ length: 10 }, () => call('POST', '/vacation-requests', { token, body })),
  );

  expect(count(statuses(responses), 201)).toBe(1);
  expect(count(statuses(responses), 409)).toBe(9);
  expect(await activeRequestsOf(USERS.requester)).toBe(1);
});

it('accepts exactly one of 10 different but overlapping submissions sent at once', async () => {
  const token = await loginAs(USERS.requester);
  const bodies = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => ({
      startDate: await futureDate(i),
      endDate: await futureDate(i + 10),
    })),
  );

  const responses = await Promise.all(
    bodies.map((body) => call('POST', '/vacation-requests', { token, body })),
  );

  expect(count(statuses(responses), 201)).toBe(1);
  for (const response of responses.filter((r) => r.status === 409)) {
    expect(response.body.error.code).toBe('VACATION_OVERLAP');
  }
  expect(await activeRequestsOf(USERS.requester)).toBe(1);
});

it('does not block different users booking the same dates at once', async () => {
  const emails = [
    USERS.requester,
    USERS.teammate,
    USERS.teammate2,
    USERS.teammate3,
    USERS.otherTeamRequester,
  ];
  const body = { startDate: await futureDate(0), endDate: await futureDate(2) };

  const responses = await Promise.all(
    emails.map(async (email) =>
      call('POST', '/vacation-requests', { token: await loginAs(email), body }),
    ),
  );

  expect(statuses(responses)).toEqual(emails.map(() => 201));
});

it('lets only the first of two validators decide a request', async () => {
  const created = await call('POST', '/vacation-requests', {
    token: await loginAs(USERS.requester),
    body: { startDate: await futureDate(0), endDate: await futureDate(1) },
  });
  const path = `/vacation-requests/${created.body.id}/status`;

  const [approve, reject] = await Promise.all([
    call('PATCH', path, {
      token: await loginAs(USERS.validator),
      body: { status: 'Approved', version: 1 },
    }),
    call('PATCH', path, {
      token: await loginAs(USERS.secondValidator),
      body: { status: 'Rejected', comments: 'No coverage', version: 1 },
    }),
  ]);

  expect([approve.status, reject.status].sort()).toEqual([200, 409]);
  const winner = approve.status === 200 ? 'Approved' : 'Rejected';
  const loser = approve.status === 200 ? reject : approve;
  expect(['REQUEST_NOT_PENDING', 'VERSION_CONFLICT']).toContain(loser.body.error.code);

  const stored = await call('GET', `/vacation-requests/${created.body.id}`, {
    token: await loginAs(USERS.validator),
  });
  expect(stored.body).toMatchObject({ status: winner, version: 2 });
});

it('rejects the second of two simultaneous edits based on the same version', async () => {
  const token = await loginAs(USERS.requester);
  const created = await call('POST', '/vacation-requests', {
    token,
    body: { startDate: await futureDate(0), endDate: await futureDate(1) },
  });
  const path = `/vacation-requests/${created.body.id}`;

  const responses = await Promise.all([
    call('PATCH', path, { token, body: { reason: 'Edit from tab A', version: 1 } }),
    call('PATCH', path, { token, body: { reason: 'Edit from tab B', version: 1 } }),
  ]);

  expect(statuses(responses).sort()).toEqual([200, 409]);
  expect(responses.find((r) => r.status === 409)?.body.error.code).toBe('VERSION_CONFLICT');
});

it('never half-applies two team plans that compete for the same people', async () => {
  const participants = [await userIdOf(USERS.teammate2), await userIdOf(USERS.teammate3)];
  const plan = async (email: string, offset: number) =>
    call('POST', '/me/team/vacation-plans', {
      token: await loginAs(email),
      body: {
        startDate: await futureDate(offset),
        endDate: await futureDate(offset + 5),
        participantIds: participants,
      },
    });

  const responses = await Promise.all([plan(USERS.requester, 0), plan(USERS.teammate, 2)]);

  expect(statuses(responses).sort()).toEqual([201, 409]);
  // Each shared participant has exactly one request: the winner's, never a mix.
  expect(await activeRequestsOf(USERS.teammate2)).toBe(1);
  expect(await activeRequestsOf(USERS.teammate3)).toBe(1);
  const loser = responses.find((r) => r.status === 409)?.body.error.code;
  expect(['TEAM_PLAN_CONFLICT', 'VACATION_OVERLAP']).toContain(loser);
});

it('resolves a cancel racing an approval: exactly one of them wins', async () => {
  const requesterToken = await loginAs(USERS.requester);
  const created = await call('POST', '/vacation-requests', {
    token: requesterToken,
    body: { startDate: await futureDate(0), endDate: await futureDate(1) },
  });

  const [cancel, approve] = await Promise.all([
    call('DELETE', `/vacation-requests/${created.body.id}`, { token: requesterToken }),
    call('PATCH', `/vacation-requests/${created.body.id}/status`, {
      token: await loginAs(USERS.validator),
      body: { status: 'Approved', version: 1 },
    }),
  ]);

  const outcomes = [cancel.status, approve.status].sort();
  // Either the cancel wins (204, then the approval finds nothing: 404),
  // or the approval wins (200, then the cancel finds an Approved request: 409).
  expect([
    [204, 404],
    [200, 409],
  ]).toContainEqual(outcomes);
});
