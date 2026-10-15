/**
 * `npm run db:create`: creates the application database and the integration-test database
 * if they do not exist yet. Connects to the default `postgres` maintenance database.
 */
import { Client } from 'pg';
import type { AppConfig } from '../../../config/config';
import { runScript } from './runScript';

export async function ensureDatabaseExists(
  database: AppConfig['database'],
  databaseName: string,
): Promise<boolean> {
  const client = new Client({
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: 'postgres',
  });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      // Identifiers cannot be bound as parameters; the name is validated by loadConfig().
      await client.query(`CREATE DATABASE "${databaseName}"`);
      return true;
    }
    return false;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runScript('db:create', async ({ database }) => {
    for (const name of [database.name, database.testName]) {
      const created = await ensureDatabaseExists(database, name);
      console.log(`[db:create] ${name}: ${created ? 'created' : 'already exists'}`);
    }
  });
}
