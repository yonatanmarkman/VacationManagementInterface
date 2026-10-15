/**
 * Unit tests for the calendar-date helpers: date validation, day arithmetic, timezones and overlaps.
 */
import {
  addDays,
  daysBetween,
  isIsoDate,
  isValidTimeZone,
  rangesOverlap,
  toIsoDateInTimeZone,
} from '../../../src/shared/time/calendarDate';

describe('calendarDate', () => {
  it.each(['2026-10-15', '2028-02-29', '2026-12-31'])('accepts the real date %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-10-15T10:00:00Z', '15/10/2026', ''])(
    'rejects %s',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-15', '2026-10-18')).toBe(3);
    expect(daysBetween('2026-10-18', '2026-10-15')).toBe(-3);
  });

  it('computes "today" in the configured timezone, not in UTC', () => {
    // 22:30 UTC on Oct 14 is already Oct 15 in Jerusalem (UTC+3 in October).
    const instant = new Date('2026-10-14T22:30:00Z');
    expect(toIsoDateInTimeZone(instant, 'UTC')).toBe('2026-10-14');
    expect(toIsoDateInTimeZone(instant, 'Asia/Jerusalem')).toBe('2026-10-15');
  });

  it('treats ranges as inclusive when checking overlap', () => {
    const range = { startDate: '2026-11-10', endDate: '2026-11-12' };
    expect(rangesOverlap(range, { startDate: '2026-11-12', endDate: '2026-11-14' })).toBe(true);
    expect(rangesOverlap(range, { startDate: '2026-11-13', endDate: '2026-11-14' })).toBe(false);
    expect(rangesOverlap(range, { startDate: '2026-11-01', endDate: '2026-11-30' })).toBe(true);
  });

  it('validates timezone names', () => {
    expect(isValidTimeZone('Asia/Jerusalem')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
