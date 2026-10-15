/**
 * Minimal structured logger: one JSON object per line on stdout/stderr.
 *
 * The level is read from LOG_LEVEL on every call, so tests can silence logs
 * by setting LOG_LEVEL=silent.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Contextual fields attached to a log line. */
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LEVEL_PRIORITY: Record<string, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function currentThreshold(): number {
  return LEVEL_PRIORITY[process.env.LOG_LEVEL ?? 'info'] ?? LEVEL_PRIORITY.info;
}

function serialize(value: unknown): unknown {
  return value instanceof Error
    ? { name: value.name, message: value.message, stack: value.stack }
    : value;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_PRIORITY[level] < currentThreshold()) {
    return;
  }
  const fields = Object.fromEntries(
    Object.entries(context ?? {}).map(([key, value]) => [key, serialize(value)]),
  );
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Application-wide logger instance. */
export const logger: Logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
};
