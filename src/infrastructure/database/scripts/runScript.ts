/**
 * Shared runner for the database CLI scripts (npm run db:*): loads .env through CEF,
 * validates the configuration, runs the task and exits with a proper status code.
 */
import 'reflect-metadata';
import { loadEnv } from 'commoneventframework';
import type { AppConfig } from '../../../config/config';
import { loadConfig } from '../../../config/config';

export function runScript(name: string, task: (config: AppConfig) => Promise<void>): void {
  loadEnv()
    .then(() => task(loadConfig()))
    .then(() => {
      console.log(`[${name}] done`);
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(`[${name}] failed:`, error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
