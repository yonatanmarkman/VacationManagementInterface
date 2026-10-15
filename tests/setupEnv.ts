/**
 * Environment defaults for every test run: silent logs and a deterministic JWT secret.
 * Values already set in the environment win.
 */
process.env.LOG_LEVEL ??= 'silent';
process.env.JWT_SECRET ??= 'test-only-secret-0123456789-abcdefghijklmnop';
