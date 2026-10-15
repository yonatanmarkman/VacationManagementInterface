/**
 * End-to-end behaviour of the API against a real PostgreSQL database.
 */
import { addDays } from '../../src/shared/time/calendarDate';
import {
  call,
  closeApp,
  futureDate,
  loginAs,
  resetData,
  today,
  USERS,
  userIdOf,
} from './support/testApi';

beforeEach(resetData);
afterAll(closeApp);

async function submit(email: string, startOffset: number, endOffset: number) {
  return call('POST', '/vacation-requests', {
    token: await loginAs(email),
    body: { startDate: await futureDate(startOffset), endDate: await futureDate(endOffset) },
  });
}

describe('authentication', () => {
  it('logs in with valid credentials and returns the profile', async () => {
    const token = await loginAs(USERS.dualRole);
    const me = await call('GET', '/auth/me', { token });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: USERS.dualRole, roles: ['Requester', 'Validator'] });
  });

  it('rejects wrong credentials with the same error for unknown emails', async () => {
    const wrongPassword = await call('POST', '/auth/login', {
      body: { email: USERS.requester, password: 'nope' },
    });
    const unknownEmail = await call('POST', '/auth/login', {
      body: { email: 'ghost@example.com', password: 'nope' },
    });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('requires a token on protected routes (401) and the right role (403)', async () => {
    const anonymous = await call('GET', '/vacation-requests');
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers['WWW-Authenticate']).toBe('Bearer');

    const asRequester = await call('GET', '/vacation-requests', {
      token: await loginAs(USERS.requester),
    });
    expect(asRequester.status).toBe(403);
    expect(asRequester.body.error.code).toBe('FORBIDDEN');
  });

  it('answers 404 for unknown routes and 405 for unsupported methods', async () => {
    const token = await loginAs(USERS.requester);
    expect((await call('GET', '/nope', { token })).status).toBe(404);
    const wrongMethod = await call('PUT', '/vacation-requests', { token });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.Allow).toBe('GET, POST');
  });
});

describe('requester flow', () => {
  it('submits, lists, reads, updates and cancels a request', async () => {
    const token = await loginAs(USERS.requester);

    const created = await submit(USERS.requester, 0, 3);
    expect(created.status).toBe(201);
    expect(created.headers.Location).toBe(`/vacation-requests/${created.body.id}`);
    expect(created.body).toMatchObject({ status: 'Pending', version: 1, comments: null });

    const mine = await call('GET', '/me/vacation-requests', {
      token,
      query: { status: 'Pending' },
    });
    expect(mine.status).toBe(200);
    expect(mine.body.data.map((r: { id: number }) => r.id)).toContain(created.body.id);

    const updated = await call('PATCH', `/vacation-requests/${created.body.id}`, {
      token,
      body: { endDate: await futureDate(4), reason: 'Longer trip', version: 1 },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ reason: 'Longer trip', version: 2 });

    const cancelled = await call('DELETE', `/vacation-requests/${created.body.id}`, { token });
    expect(cancelled.status).toBe(204);
    expect((await call('GET', `/vacation-requests/${created.body.id}`, { token })).status).toBe(
      404,
    );
  });

  it('enforces the date rules', async () => {
    const token = await loginAs(USERS.requester);
    const day = await today();
    const post = (startDate: string, endDate: string) =>
      call('POST', '/vacation-requests', { token, body: { startDate, endDate } });

    expect((await post(addDays(day, 5), addDays(day, 4))).body.error.code).toBe(
      'INVALID_DATE_RANGE',
    );
    expect((await post(day, addDays(day, 2))).body.error.code).toBe('START_DATE_NOT_IN_FUTURE');
    expect((await post(addDays(day, -3), addDays(day, -1))).body.error.code).toBe(
      'START_DATE_NOT_IN_FUTURE',
    );
    expect((await post(addDays(day, 1), addDays(day, 1))).status).toBe(201); // one day, tomorrow
  });

  it('refuses overlapping and duplicate requests', async () => {
    expect((await submit(USERS.requester, 0, 5)).status).toBe(201);

    const overlap = await submit(USERS.requester, 5, 8);
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('VACATION_OVERLAP');

    const duplicate = await submit(USERS.requester, 0, 5);
    expect(duplicate.body.error.code).toBe('DUPLICATE_VACATION_REQUEST');

    expect((await submit(USERS.teammate, 0, 5)).status).toBe(201); // other users are independent
  });

  it("hides other users' requests and cannot set the status", async () => {
    const created = await submit(USERS.requester, 0, 1);
    const otherToken = await loginAs(USERS.teammate);
    expect(
      (await call('GET', `/vacation-requests/${created.body.id}`, { token: otherToken })).status,
    ).toBe(404);

    const selfApprove = await call('PATCH', `/vacation-requests/${created.body.id}`, {
      token: await loginAs(USERS.requester),
      body: { status: 'Approved', version: 1 },
    });
    expect(selfApprove.status).toBe(400);
    expect(selfApprove.body.error.code).toBe('READ_ONLY_FIELD');
  });
});

describe('validator flow', () => {
  it('approves a request, which then becomes immutable', async () => {
    const created = await submit(USERS.requester, 0, 2);
    const validatorToken = await loginAs(USERS.validator);

    const approved = await call('PATCH', `/vacation-requests/${created.body.id}/status`, {
      token: validatorToken,
      body: { status: 'Approved', version: 1 },
    });
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({ status: 'Approved', version: 2 });

    const edit = await call('PATCH', `/vacation-requests/${created.body.id}`, {
      token: await loginAs(USERS.requester),
      body: { reason: 'too late', version: 2 },
    });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('REQUEST_NOT_PENDING');
  });

  it('requires a comment to reject', async () => {
    const created = await submit(USERS.requester, 0, 2);
    const token = await loginAs(USERS.validator);
    const path = `/vacation-requests/${created.body.id}/status`;

    const noComment = await call('PATCH', path, {
      token,
      body: { status: 'Rejected', version: 1 },
    });
    expect(noComment.body.error.code).toBe('REJECTION_COMMENT_REQUIRED');

    const rejected = await call('PATCH', path, {
      token,
      body: { status: 'Rejected', comments: 'Release week', version: 1 },
    });
    expect(rejected.body).toMatchObject({ status: 'Rejected', comments: 'Release week' });
  });

  it('forbids a dual-role user from deciding their own request', async () => {
    const created = await submit(USERS.dualRole, 0, 2);
    const response = await call('PATCH', `/vacation-requests/${created.body.id}/status`, {
      token: await loginAs(USERS.dualRole),
      body: { status: 'Approved', version: 1 },
    });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SELF_DECISION_FORBIDDEN');
  });

  it('filters and paginates all requests', async () => {
    const token = await loginAs(USERS.validator);
    const page1 = await call('GET', '/vacation-requests', {
      token,
      query: { status: 'Pending', limit: '3', sortBy: 'startDate', sortOrder: 'asc' },
    });
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.pagination).toMatchObject({
      page: 1,
      limit: 3,
      totalItems: 9,
      totalPages: 3,
    });
    expect(page1.body.data.every((r: { status: string }) => r.status === 'Pending')).toBe(true);
    const starts = page1.body.data.map((r: { startDate: string }) => r.startDate);
    expect([...starts].sort()).toEqual(starts);

    const omer = await userIdOf('omer.peretz@example.com');
    const byUser = await call('GET', '/vacation-requests', {
      token,
      query: { userId: String(omer) },
    });
    expect(byUser.body.data.every((r: { userId: number }) => r.userId === omer)).toBe(true);
    expect(byUser.body.pagination.totalItems).toBe(3); // 2 own requests + 1 from the seeded team plan

    const reservations = byUser.body.data[0].user.team.id;
    const byTeam = await call('GET', '/vacation-requests', {
      token,
      query: { teamId: String(reservations) },
    });
    expect(
      byTeam.body.data.every(
        (r: { user: { team: { id: number } } }) => r.user.team.id === reservations,
      ),
    ).toBe(true);
    expect(byTeam.body.pagination.totalItems).toBe(9);

    const day = await today();
    const window = await call('GET', '/vacation-requests', {
      token,
      query: { startDate: addDays(day, 10), endDate: addDays(day, 20) },
    });
    for (const request of window.body.data) {
      expect(request.startDate >= addDays(day, 10) && request.endDate <= addDays(day, 20)).toBe(
        true,
      );
    }
  });
});

describe('team planning', () => {
  it('shows the team calendar without private fields', async () => {
    const calendar = await call('GET', '/me/team/vacations', {
      token: await loginAs(USERS.validator),
    });
    expect(calendar.status).toBe(200);
    expect(calendar.body.team.name).toBe('Engineering');
    expect(calendar.body.entries.length).toBeGreaterThan(0);
    for (const entry of calendar.body.entries) {
      expect(Object.keys(entry).sort()).toEqual([
        'endDate',
        'requestId',
        'startDate',
        'status',
        'user',
      ]);
      expect(['Pending', 'Approved']).toContain(entry.status);
    }
  });

  it('plans a team vacation that every participant can follow', async () => {
    const created = await call('POST', '/me/team/vacation-plans', {
      token: await loginAs(USERS.requester),
      body: {
        startDate: await futureDate(10),
        endDate: await futureDate(12),
        reason: 'Offsite',
        participantIds: [await userIdOf(USERS.teammate), await userIdOf(USERS.teammate2)],
      },
    });
    expect(created.status).toBe(201);
    expect(created.headers.Location).toBe(`/me/team/vacation-plans/${created.body.id}`);
    expect(created.body.participants).toHaveLength(3);
    expect(created.body.summary).toEqual({ Pending: 3, Approved: 0, Rejected: 0 });

    // A validator approves one participant and rejects another, individually.
    const daniel = created.body.participants.find(
      (p: { name: string }) => p.name === 'Daniel Cohen',
    );
    const maya = created.body.participants.find(
      (p: { name: string }) => p.name === 'Maya Friedman',
    );
    const validatorToken = await loginAs(USERS.validator);
    await call('PATCH', `/vacation-requests/${daniel.requestId}/status`, {
      token: validatorToken,
      body: { status: 'Approved', version: 1 },
    });
    await call('PATCH', `/vacation-requests/${maya.requestId}/status`, {
      token: validatorToken,
      body: { status: 'Rejected', comments: 'Deadline that week', version: 1 },
    });

    // The proposer sees every participant's outcome, but not the comments meant for others.
    const asProposer = await call('GET', `/me/team/vacation-plans/${created.body.id}`, {
      token: await loginAs(USERS.requester),
    });
    expect(asProposer.body.summary).toEqual({ Pending: 1, Approved: 1, Rejected: 1 });
    const mayaSeenByProposer = asProposer.body.participants.find(
      (p: { userId: number }) => p.userId === maya.userId,
    );
    expect(mayaSeenByProposer).toMatchObject({ status: 'Rejected', comments: null });

    // Maya sees the plan in her list, with her own rejection comment.
    const mayasPlans = await call('GET', '/me/team/vacation-plans', {
      token: await loginAs(USERS.teammate2),
    });
    const mine = mayasPlans.body.data[0].participants.find(
      (p: { userId: number }) => p.userId === maya.userId,
    );
    expect(mine).toMatchObject({ status: 'Rejected', comments: 'Deadline that week' });

    // Her request is tagged with the plan.
    const request = await call('GET', `/vacation-requests/${maya.requestId}`, {
      token: await loginAs(USERS.teammate2),
    });
    expect(request.body.teamPlan).toEqual({
      id: created.body.id,
      proposedBy: { id: await userIdOf(USERS.requester), name: 'Noa Levi' },
    });

    // Someone outside the plan cannot see it.
    const outsider = await call('GET', `/me/team/vacation-plans/${created.body.id}`, {
      token: await loginAs(USERS.otherTeamRequester),
    });
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('TEAM_PLAN_NOT_FOUND');
  });

  it('shows the seeded team plan to its participants', async () => {
    const plans = await call('GET', '/me/team/vacation-plans', {
      token: await loginAs('omer.peretz@example.com'),
    });
    expect(plans.body.pagination.totalItems).toBe(1);
    expect(plans.body.data[0]).toMatchObject({
      proposedBy: { name: 'Yael Shapiro' },
      summary: { Pending: 0, Approved: 2, Rejected: 1 },
    });
  });

  it('creates nothing if one participant is busy, and validators cannot propose', async () => {
    expect((await submit(USERS.teammate, 10, 11)).status).toBe(201);
    const body = {
      startDate: await futureDate(10),
      endDate: await futureDate(12),
      participantIds: [await userIdOf(USERS.teammate), await userIdOf(USERS.teammate2)],
    };

    const conflict = await call('POST', '/me/team/vacation-plans', {
      token: await loginAs(USERS.requester),
      body,
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('TEAM_PLAN_CONFLICT');
    const mine = await call('GET', '/me/vacation-requests', {
      token: await loginAs(USERS.requester),
      query: { limit: '100' },
    });
    expect(mine.body.data.some((r: { startDate: string }) => r.startDate === body.startDate)).toBe(
      false,
    );

    const asValidator = await call('POST', '/me/team/vacation-plans', {
      token: await loginAs(USERS.validator),
      body,
    });
    expect(asValidator.status).toBe(403);
  });

  it('refuses participants from another team', async () => {
    const response = await call('POST', '/me/team/vacation-plans', {
      token: await loginAs(USERS.requester),
      body: {
        startDate: await futureDate(30),
        endDate: await futureDate(31),
        participantIds: [await userIdOf(USERS.otherTeamRequester)],
      },
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PARTICIPANTS');
  });
});
