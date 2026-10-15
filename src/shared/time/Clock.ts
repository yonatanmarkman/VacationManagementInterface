/**
 * Clock abstraction, so business rules that depend on "today" are testable.
 */
import type { IsoDate } from './calendarDate';
import { toIsoDateInTimeZone } from './calendarDate';

export interface Clock {
  /** Today's calendar date in the application timezone. */
  today(): IsoDate;
}

/** Real clock: the system time, seen from the configured timezone. */
export class SystemClock implements Clock {
  constructor(private readonly timeZone: string) {}

  today(): IsoDate {
    return toIsoDateInTimeZone(new Date(), this.timeZone);
  }
}

/** Clock frozen on a given day (used by tests). */
export class FixedClock implements Clock {
  constructor(private readonly fixedToday: IsoDate) {}

  today(): IsoDate {
    return this.fixedToday;
  }
}
