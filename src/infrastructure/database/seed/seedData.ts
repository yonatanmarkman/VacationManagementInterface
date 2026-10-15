/**
 * Demo data: 3 teams and 15 users (10 Requesters, 3 Validators, 2 with both roles),
 * plus vacation requests in every status. Request dates are relative to the seeding day,
 * so the data always looks current. Every demo user's password is DEMO_PASSWORD.
 */
import { UserRole } from '../../../modules/users/domain/UserRole';
import { VacationRequestStatus } from '../../../modules/vacation-requests/domain/VacationRequestStatus';

export const DEMO_PASSWORD = 'Password123!';

export const SEED_TEAMS = ['Engineering', 'Reservations', 'Marketing'] as const;
type TeamName = (typeof SEED_TEAMS)[number];

export interface SeedUser {
  readonly name: string;
  readonly email: string;
  readonly roles: UserRole[];
  readonly team: TeamName;
}

const { Requester, Validator } = UserRole;

export const SEED_USERS: readonly SeedUser[] = [
  // Engineering
  { name: 'Noa Levi', email: 'noa.levi@example.com', roles: [Requester], team: 'Engineering' },
  {
    name: 'Daniel Cohen',
    email: 'daniel.cohen@example.com',
    roles: [Requester],
    team: 'Engineering',
  },
  {
    name: 'Maya Friedman',
    email: 'maya.friedman@example.com',
    roles: [Requester],
    team: 'Engineering',
  },
  { name: 'Liam Katz', email: 'liam.katz@example.com', roles: [Requester], team: 'Engineering' },
  {
    name: 'Sarah Mizrahi',
    email: 'sarah.mizrahi@example.com',
    roles: [Validator],
    team: 'Engineering',
  },
  {
    name: 'David Ben-Ami',
    email: 'david.benami@example.com',
    roles: [Requester, Validator],
    team: 'Engineering',
  },
  // Reservations
  {
    name: 'Yael Shapiro',
    email: 'yael.shapiro@example.com',
    roles: [Requester],
    team: 'Reservations',
  },
  {
    name: 'Omer Peretz',
    email: 'omer.peretz@example.com',
    roles: [Requester],
    team: 'Reservations',
  },
  {
    name: 'Tamar Biton',
    email: 'tamar.biton@example.com',
    roles: [Requester],
    team: 'Reservations',
  },
  {
    name: 'Michael Azoulay',
    email: 'michael.azoulay@example.com',
    roles: [Validator],
    team: 'Reservations',
  },
  {
    name: 'Ruth Avraham',
    email: 'ruth.avraham@example.com',
    roles: [Requester, Validator],
    team: 'Reservations',
  },
  // Marketing
  { name: 'Itai Golan', email: 'itai.golan@example.com', roles: [Requester], team: 'Marketing' },
  { name: 'Shira Dahan', email: 'shira.dahan@example.com', roles: [Requester], team: 'Marketing' },
  { name: 'Eitan Rosen', email: 'eitan.rosen@example.com', roles: [Requester], team: 'Marketing' },
  { name: 'Hila Barak', email: 'hila.barak@example.com', roles: [Validator], team: 'Marketing' },
];

export interface SeedVacationRequest {
  readonly email: string;
  /** Offsets in days from the seeding day (negative = in the past). */
  readonly startOffset: number;
  readonly endOffset: number;
  readonly status: VacationRequestStatus;
  readonly reason?: string;
  readonly comments?: string;
}

const { Pending, Approved, Rejected } = VacationRequestStatus;

export const SEED_VACATION_REQUESTS: readonly SeedVacationRequest[] = [
  {
    email: 'noa.levi@example.com',
    startOffset: -60,
    endOffset: -56,
    status: Approved,
    reason: 'Family trip',
  },
  {
    email: 'noa.levi@example.com',
    startOffset: 14,
    endOffset: 18,
    status: Pending,
    reason: 'Hiking in the north',
  },
  { email: 'daniel.cohen@example.com', startOffset: 20, endOffset: 24, status: Pending },
  {
    email: 'daniel.cohen@example.com',
    startOffset: 30,
    endOffset: 31,
    status: Rejected,
    reason: 'Long weekend',
    comments: 'Release week - please pick other dates.',
  },
  {
    email: 'maya.friedman@example.com',
    startOffset: 45,
    endOffset: 52,
    status: Approved,
    reason: 'Honeymoon',
    comments: 'Congratulations!',
  },
  {
    email: 'liam.katz@example.com',
    startOffset: 7,
    endOffset: 7,
    status: Pending,
    reason: 'Moving apartment',
  },
  {
    email: 'david.benami@example.com',
    startOffset: 21,
    endOffset: 25,
    status: Pending,
    reason: 'Conference abroad',
  },
  { email: 'yael.shapiro@example.com', startOffset: -20, endOffset: -18, status: Approved },
  {
    email: 'yael.shapiro@example.com',
    startOffset: 10,
    endOffset: 12,
    status: Pending,
    reason: 'Wedding of a friend',
  },
  {
    email: 'omer.peretz@example.com',
    startOffset: 5,
    endOffset: 9,
    status: Rejected,
    comments: 'Peak season - not enough coverage at the desk.',
  },
  { email: 'omer.peretz@example.com', startOffset: 40, endOffset: 44, status: Pending },
  {
    email: 'tamar.biton@example.com',
    startOffset: 60,
    endOffset: 70,
    status: Approved,
    reason: 'Trip to Japan',
  },
  { email: 'ruth.avraham@example.com', startOffset: 15, endOffset: 16, status: Pending },
  {
    email: 'itai.golan@example.com',
    startOffset: 3,
    endOffset: 5,
    status: Pending,
    reason: 'Personal matters',
  },
  { email: 'shira.dahan@example.com', startOffset: 25, endOffset: 29, status: Approved },
  {
    email: 'shira.dahan@example.com',
    startOffset: 90,
    endOffset: 95,
    status: Pending,
    reason: 'Summer vacation',
  },
  {
    email: 'eitan.rosen@example.com',
    startOffset: 12,
    endOffset: 13,
    status: Rejected,
    comments: 'Campaign launch on those days.',
  },
];
