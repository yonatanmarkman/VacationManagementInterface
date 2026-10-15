/**
 * Replaces all data with the demo data set (idempotent: safe to run again at any time).
 *
 * Identity counters are reset, so demo users always get ids 1..15 in SEED_USERS order.
 * Seeding writes directly to the tables: past-dated history requests are intentional and
 * would (correctly) be refused by the API's business rules.
 */
import type { DataSource } from 'typeorm';
import { BcryptPasswordHasher } from '../../../modules/auth/infrastructure/BcryptPasswordHasher';
import { Team } from '../../../modules/teams/domain/Team';
import { TeamVacationPlan } from '../../../modules/teams/domain/TeamVacationPlan';
import { User } from '../../../modules/users/domain/User';
import { VacationRequest } from '../../../modules/vacation-requests/domain/VacationRequest';
import type { IsoDate } from '../../../shared/time/calendarDate';
import { addDays } from '../../../shared/time/calendarDate';
import {
  DEMO_PASSWORD,
  SEED_TEAM_PLANS,
  SEED_TEAMS,
  SEED_USERS,
  SEED_VACATION_REQUESTS,
} from './seedData';

export interface SeedSummary {
  readonly teams: number;
  readonly users: number;
  readonly vacationRequests: number;
  readonly teamPlans: number;
}

export async function seedDatabase(dataSource: DataSource, today: IsoDate): Promise<SeedSummary> {
  const passwordHash = await new BcryptPasswordHasher().hash(DEMO_PASSWORD);

  return dataSource.transaction(async (manager) => {
    await manager.query(
      'TRUNCATE TABLE vacation_requests, team_vacation_plans, users, teams RESTART IDENTITY CASCADE',
    );

    const teams = await manager.save(SEED_TEAMS.map((name) => manager.create(Team, { name })));
    const teamIdByName = new Map(teams.map((team) => [team.name, team.id]));

    const users: User[] = [];
    for (const seedUser of SEED_USERS) {
      users.push(
        await manager.save(
          manager.create(User, {
            name: seedUser.name,
            email: seedUser.email,
            password: passwordHash,
            roles: seedUser.roles,
            teamId: teamIdByName.get(seedUser.team),
          }),
        ),
      );
    }
    const userIdByEmail = new Map(users.map((user) => [user.email, user.id]));

    const requests = SEED_VACATION_REQUESTS.map((seed) =>
      manager.create(VacationRequest, {
        userId: userIdByEmail.get(seed.email),
        startDate: addDays(today, seed.startOffset),
        endDate: addDays(today, seed.endOffset),
        reason: seed.reason ?? null,
        status: seed.status,
        comments: seed.comments ?? null,
      }),
    );
    await manager.save(requests);

    let planRequests = 0;
    for (const seedPlan of SEED_TEAM_PLANS) {
      const proposer = users.find((user) => user.email === seedPlan.proposer) as User;
      const period = {
        startDate: addDays(today, seedPlan.startOffset),
        endDate: addDays(today, seedPlan.endOffset),
      };
      const plan = await manager.save(
        TeamVacationPlan.propose({
          proposerId: proposer.id,
          teamId: proposer.teamId,
          ...period,
          reason: seedPlan.reason,
        }),
      );
      await manager.save(
        seedPlan.participants.map((participant) =>
          manager.create(VacationRequest, {
            userId: userIdByEmail.get(participant.email),
            ...period,
            reason: seedPlan.reason,
            status: participant.status,
            comments: participant.comments ?? null,
            teamPlanId: plan.id,
          }),
        ),
      );
      planRequests += seedPlan.participants.length;
    }

    return {
      teams: teams.length,
      users: users.length,
      vacationRequests: requests.length + planRequests,
      teamPlans: SEED_TEAM_PLANS.length,
    };
  });
}
