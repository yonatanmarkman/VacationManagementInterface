/**
 * `npm run db:seed`: replaces all data with the demo data set.
 */
import { SystemClock } from '../../../shared/time/Clock';
import { createDataSource } from '../dataSource';
import { seedDatabase } from '../seed/seedDatabase';
import { runScript } from './runScript';

runScript('db:seed', async ({ database, timeZone }) => {
  const dataSource = await createDataSource(database).initialize();
  try {
    const summary = await seedDatabase(dataSource, new SystemClock(timeZone).today());
    console.log(
      `[db:seed] ${summary.teams} teams, ${summary.users} users, ${summary.vacationRequests} vacation requests, ${summary.teamPlans} team plan(s)`,
    );
  } finally {
    await dataSource.destroy();
  }
});
