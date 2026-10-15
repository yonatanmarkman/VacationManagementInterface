/**
 * Jest config for integration tests: runs the full HTTP pipeline against a real
 * PostgreSQL test database (DB_NAME_TEST), which is wiped and re-migrated on every run.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  setupFiles: ['<rootDir>/tests/setupEnv.ts', '<rootDir>/tests/integration/useTestDatabase.ts'],
  globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
  testTimeout: 30000,
};
