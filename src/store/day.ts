/**
 * Logical-day arithmetic.
 *
 * The user chooses when their day ends (default 02:00), so the calendar date is
 * the wrong key: at 01:00 on the 5th they are still living the 4th. Every day
 * key in the app is therefore the calendar date of `now` shifted back by the
 * day-end offset.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Parses `'HH:mm'` into minutes past midnight. Falls back to 0 on garbage. */
export function parseDayEnd(dayEndsAt: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(dayEndsAt.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return 0;
  return hours * 60 + minutes;
}

export function formatDayEnd(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** `'02:00'` -> `'2:00 AM'`, for display. */
export function formatDayEndLabel(dayEndsAt: string): string {
  const minutes = parseDayEnd(dayEndsAt);
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight of a `YYYY-MM-DD` key. */
function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** The logical day `now` belongs to, given the day-end setting. */
export function logicalDateKey(now: number, dayEndsAt: string): string {
  return toKey(new Date(now - parseDayEnd(dayEndsAt) * MS_PER_MINUTE));
}

/** Epoch ms at which the logical day `key` stops being "today". */
export function logicalDayEnd(key: string, dayEndsAt: string): number {
  const start = fromKey(key);
  start.setDate(start.getDate() + 1);
  return start.getTime() + parseDayEnd(dayEndsAt) * MS_PER_MINUTE;
}

/** Whole logical days between two keys (`b - a`). Negative if `b` precedes `a`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / MS_PER_DAY);
}

export function nextDateKey(key: string, step = 1): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + step);
  return toKey(date);
}

/** True when `b` is the logical day immediately after `a`. */
export function isConsecutive(a: string, b: string): boolean {
  return daysBetween(a, b) === 1;
}

/** `'2026-09-04'` -> `'Fri, Sep 4'`. */
export function formatDateKey(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Human countdown to the day's end, e.g. `'4h 12m left'`. */
export function formatTimeLeft(msRemaining: number): string {
  if (msRemaining <= 0) return 'Day over';
  const totalMinutes = Math.floor(msRemaining / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  if (totalMinutes >= 1) return `${totalMinutes}m left`;
  return 'Less than a minute left';
}
