/**
 * Jest setup file: loads .env and points the application at the integration-test database
 * (DB_NAME_TEST), so integration tests can never touch the development data.
 */
import { config } from 'dotenv';

config({ quiet: true });
process.env.DB_NAME = process.env.DB_NAME_TEST ?? 'vacation_db_test';
