/**
 * Runs once before the integration tests: creates the test database if needed, then
 * drops everything in it and applies all migrations, so every run starts from a clean schema.
 */
import 'reflect-metadata';
import { config as loadDotEnv } from 'dotenv';
import { loadConfig } from '../../src/config/config';
import { createDataSource } from '../../src/infrastructure/database/dataSource';
import { ensureDatabaseExists } from '../../src/infrastructure/database/scripts/createDatabases';

export default async function globalSetup(): Promise<void> {
  loadDotEnv({ quiet: true });
  const { database } = loadConfig();
  await ensureDatabaseExists(database, database.testName);

  const dataSource = await createDataSource(database, database.testName).initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations({ transaction: 'each' });
  } finally {
    await dataSource.destroy();
  }
}
