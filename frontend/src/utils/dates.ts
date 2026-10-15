/**
 * Calendar-date helpers. Like the API, the UI works with whole days as "YYYY-MM-DD" strings.
 */
import type { IsoDate } from '@/types/api';

function toIsoDate(date: Date): IsoDate {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Today in the browser's timezone. */
export function today(): IsoDate {
  return toIsoDate(new Date());
}

/** Adds (or subtracts) days to a date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const result = fromIsoDate(date);
  result.setDate(result.getDate() + days);
  return toIsoDate(result);
}

/** Earliest date a vacation may start (vacations must start after the day they are requested). */
export function earliestStartDate(): IsoDate {
  return addDays(today(), 1);
}

/** Number of days in an inclusive range (a one-day vacation counts as 1). */
export function dayCount(startDate: IsoDate, endDate: IsoDate): number {
  const ms = fromIsoDate(endDate).getTime() - fromIsoDate(startDate).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** "2026-10-15" -> "15 Oct 2026" */
export function formatDate(date: IsoDate): string {
  return dateFormat.format(fromIsoDate(date));
}

/** "2026-10-15" -> "October 2026" */
export function formatMonth(date: IsoDate): string {
  return monthFormat.format(fromIsoDate(date));
}

/** "15 Oct 2026 - 18 Oct 2026", or a single date for one-day vacations. */
export function formatRange(startDate: IsoDate, endDate: IsoDate): string {
  return startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
