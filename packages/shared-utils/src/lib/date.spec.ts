import { addDays, formatRelative, isPast, toIso } from './date';

describe('date utilities', () => {
  // Fixed reference point for deterministic relative-time assertions.
  const now = new Date('2026-07-17T12:00:00.000Z');
  const iso = (ms: number) => new Date(now.getTime() + ms).toISOString();

  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  describe('toIso', () => {
    it('returns a UTC ISO string ending in Z', () => {
      const result = toIso(new Date('2026-07-17T12:00:00.000Z'));
      expect(result).toBe('2026-07-17T12:00:00.000Z');
      expect(result.endsWith('Z')).toBe(true);
    });

    it('defaults to the current time when no date is given', () => {
      expect(toIso()).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    });
  });

  describe('formatRelative', () => {
    it('returns "<1 min" under 60 seconds', () => {
      expect(formatRelative(iso(-30 * SEC), now)).toBe('<1 min');
    });

    it('rounds seconds into the minute bucket (90s -> 2 min)', () => {
      expect(formatRelative(iso(-90 * SEC), now)).toBe('2 min');
    });

    it('treats the exact 60s boundary as 1 min', () => {
      expect(formatRelative(iso(-60 * SEC), now)).toBe('1 min');
    });

    it('returns "N min" up to 59 min', () => {
      expect(formatRelative(iso(-5 * MIN), now)).toBe('5 min');
      expect(formatRelative(iso(-59 * MIN), now)).toBe('59 min');
    });

    it('returns "N h" between 1h and 23h', () => {
      expect(formatRelative(iso(-1 * HOUR), now)).toBe('1 h');
      expect(formatRelative(iso(-23 * HOUR), now)).toBe('23 h');
    });

    it('treats the exact 24h boundary as 1 d', () => {
      expect(formatRelative(iso(-24 * HOUR), now)).toBe('1 d');
    });

    it('returns "N d" between 1 and 6 days', () => {
      expect(formatRelative(iso(-2 * DAY), now)).toBe('2 d');
      expect(formatRelative(iso(-6 * DAY), now)).toBe('6 d');
    });

    it('falls back to YYYY-MM-DD for dates older than 7 days', () => {
      const input = iso(-10 * DAY);
      expect(formatRelative(input, now)).toBe(input.slice(0, 10));
    });

    it('handles a future date via the absolute diff', () => {
      expect(formatRelative(iso(2 * HOUR), now)).toBe('2 h');
    });
  });

  describe('isPast', () => {
    it('returns true for a past ISO date', () => {
      expect(isPast(iso(-1 * MIN), now)).toBe(true);
    });

    it('returns false for a future ISO date', () => {
      expect(isPast(iso(1 * MIN), now)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds days in UTC and crosses a month boundary', () => {
      expect(addDays('2026-01-31T00:00:00.000Z', 1)).toBe('2026-02-01T00:00:00.000Z');
    });

    it('subtracts with a negative count', () => {
      expect(addDays('2026-03-01T00:00:00.000Z', -1)).toBe('2026-02-28T00:00:00.000Z');
    });

    it('crosses a year boundary', () => {
      expect(addDays('2026-12-31T00:00:00.000Z', 1)).toBe('2027-01-01T00:00:00.000Z');
    });
  });
});
