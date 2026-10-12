import type { AppState, Availability, Org } from './types';

/** First start hour shown in the grid and offered as a suggestion. */
export const FIRST_HOUR = 8;
/** Last start hour, so the last slot is 10–11pm. */
export const LAST_HOUR = 22;
export const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
/** Grid columns, Sunday first. Values are JS weekdays. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const slotKey = (weekday: number, hour: number) => weekday * 24 + hour;

export function startOfDay(ts: number, offsetDays = 0) {
  const date = new Date(ts);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function hasAvailability(availability: Availability | undefined) {
  return !!availability && availability.weekly.length > 0;
}

export type Fit = 'free' | 'busy' | 'away' | 'unknown';

/** Whether a one-hour event starting at `ts` fits someone's general availability. */
export function fitAt(availability: Availability | undefined, ts: number): Fit {
  if (!hasAvailability(availability)) return 'unknown';
  if (availability!.away.includes(startOfDay(ts))) return 'away';
  const date = new Date(ts);
  return availability!.weekly.includes(slotKey(date.getDay(), date.getHours())) ? 'free' : 'busy';
}

export function freeMembers(state: AppState, org: Org, ts: number) {
  return org.memberIds.filter((userId) => fitAt(state.availability[userId], ts) === 'free');
}

export type Suggestion = { startsAt: number; free: string[] };

/**
 * Hour slots where the most members are usually free, best first. Only one
 * slot per day so the suggestions give people real alternatives.
 */
export function suggestTimes(
  state: AppState,
  org: Org,
  { from, days, count }: { from: number; days: number; count: number },
): Suggestion[] {
  const candidates: Suggestion[] = [];
  for (let offset = 0; offset < days; offset++) {
    const day = startOfDay(from, offset);
    for (const hour of HOURS) {
      const date = new Date(day);
      date.setHours(hour, 0, 0, 0);
      const startsAt = date.getTime();
      if (startsAt <= from) continue;
      const free = freeMembers(state, org, startsAt);
      if (free.length > 0) candidates.push({ startsAt, free });
    }
  }

  candidates.sort((a, b) => b.free.length - a.free.length || a.startsAt - b.startsAt);
  const picked: Suggestion[] = [];
  const usedDays = new Set<number>();
  for (const candidate of candidates) {
    const day = startOfDay(candidate.startsAt);
    if (usedDays.has(day)) continue;
    usedDays.add(day);
    picked.push(candidate);
    if (picked.length === count) break;
  }
  return picked;
}
