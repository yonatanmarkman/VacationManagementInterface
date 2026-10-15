/**
 * `npm run db:migrate`: applies pending migrations to the application database.
 */
import { createDataSource } from '../dataSource';
import { runScript } from './runScript';

runScript('db:migrate', async ({ database }) => {
  const dataSource = await createDataSource(database).initialize();
  try {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    console.log(`[db:migrate] applied ${applied.length} migration(s)`);
  } finally {
    await dataSource.destroy();
  }
});
