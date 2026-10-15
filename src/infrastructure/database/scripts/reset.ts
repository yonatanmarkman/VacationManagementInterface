/**
 * `npm run db:reset`: drops every table in the application database, re-runs all
 * migrations and re-seeds the demo data.
 */
import { SystemClock } from '../../../shared/time/Clock';
import { createDataSource } from '../dataSource';
import { seedDatabase } from '../seed/seedDatabase';
import { runScript } from './runScript';

runScript('db:reset', async ({ database, timeZone }) => {
  const dataSource = await createDataSource(database).initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations({ transaction: 'each' });
    await seedDatabase(dataSource, new SystemClock(timeZone).today());
  } finally {
    await dataSource.destroy();
  }
});
