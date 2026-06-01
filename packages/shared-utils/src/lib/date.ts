/** ISO-8601 timestamp helper. Always UTC, always `YYYY-MM-DDTHH:mm:ss.sssZ`. */
export function toIso(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Format an ISO date string into a human-friendly relative label in Portuguese.
 * Returns "<1 min", "5 min", "2 h", "3 d", or absolute `YYYY-MM-DD` for >7d.
 *
 * This is intentionally locale-agnostic at the format level — for full i18n,
 * use Angular's `DatePipe` in the presentation layer.
 */
export function formatRelative(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  if (absSec < 60) return '<1 min';
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return `${absMin} min`;
  const absHr = Math.round(absMin / 60);
  if (absHr < 24) return `${absHr} h`;
  const absDay = Math.round(absHr / 24);
  if (absDay < 7) return `${absDay} d`;
  return isoDate.slice(0, 10);
}

/** Returns true when `isoDate` is in the past relative to `now`. */
export function isPast(isoDate: string, now: Date = new Date()): boolean {
  return new Date(isoDate).getTime() < now.getTime();
}

/** Add a number of days to a date and return a new ISO string. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
