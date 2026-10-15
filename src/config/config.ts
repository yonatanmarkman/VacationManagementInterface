/**
 * Typed application configuration, read from environment variables (.env).
 *
 * The environment is validated once at startup; a missing or invalid value
 * fails fast with a message that names the variable.
 */
import { z } from 'zod';
import { isValidTimeZone } from '../shared/time/calendarDate';

export interface AppConfig {
  readonly database: {
    readonly host: string;
    readonly port: number;
    readonly user: string;
    readonly password: string;
    readonly name: string;
    readonly testName: string;
    readonly poolSize: number;
    readonly logQueries: boolean;
  };
  readonly auth: {
    readonly jwtSecret: string;
    readonly tokenTtlSeconds: number;
  };
  readonly timeZone: string;
}

const DATABASE_NAME = /^[a-z_][a-z0-9_]*$/;
const DURATION = /^(\d+)([smhd])$/;
const SECONDS_PER_UNIT: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

const envSchema = z.object({
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().min(1, 'is required: set your PostgreSQL password in .env'),
  DB_NAME: z.string().regex(DATABASE_NAME).default('vacation_db'),
  DB_NAME_TEST: z.string().regex(DATABASE_NAME).default('vacation_db_test'),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  DB_LOG_QUERIES: z.enum(['true', 'false']).default('false'),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().regex(DURATION, 'must look like 30m, 8h or 1d').default('8h'),
  APP_TIMEZONE: z
    .string()
    .refine(isValidTimeZone, 'is not a valid IANA timezone')
    .default('Asia/Jerusalem'),
});

function durationToSeconds(duration: string): number {
  const [, amount, unit] = DURATION.exec(duration) as RegExpExecArray;
  return Number(amount) * SECONDS_PER_UNIT[unit];
}

/** Parses and validates the environment. Throws a descriptive error if it is invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')} ${issue.message}`,
    );
    throw new Error(`Invalid configuration (check your .env file):\n${problems.join('\n')}`);
  }
  const values = parsed.data;
  return {
    database: {
      host: values.DB_HOST,
      port: values.DB_PORT,
      user: values.DB_USER,
      password: values.DB_PASSWORD,
      name: values.DB_NAME,
      testName: values.DB_NAME_TEST,
      poolSize: values.DB_POOL_SIZE,
      logQueries: values.DB_LOG_QUERIES === 'true',
    },
    auth: {
      jwtSecret: values.JWT_SECRET,
      tokenTtlSeconds: durationToSeconds(values.JWT_EXPIRES_IN),
    },
    timeZone: values.APP_TIMEZONE,
  };
}
