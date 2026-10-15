/**
 * Helpers for calendar dates (whole days, no time component).
 *
 * Vacations are measured in days, so dates are represented as ISO strings
 * ("YYYY-MM-DD"). Such strings sort chronologically, which keeps comparisons
 * simple and free of timezone bugs.
 */

/** A calendar date in "YYYY-MM-DD" format. */
export type IsoDate = string;

/** An inclusive range of calendar days. */
export interface DateRange {
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMillis(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Returns true if the value is a real calendar date in "YYYY-MM-DD" format (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Adds (or subtracts, for negative values) a number of days to a date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtcMillis(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Number of days from `startDate` to `endDate` (negative if `endDate` is earlier). */
export function daysBetween(startDate: IsoDate, endDate: IsoDate): number {
  return Math.round((toUtcMillis(endDate) - toUtcMillis(startDate)) / MS_PER_DAY);
}

/** Returns the calendar date of an instant in the given IANA timezone. */
export function toIsoDateInTimeZone(instant: Date, timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Returns true if the two inclusive ranges share at least one day. */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/** Returns true if the value is a valid IANA timezone name (e.g. "Asia/Jerusalem"). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
