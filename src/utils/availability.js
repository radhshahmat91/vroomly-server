import { toDateOnly } from './dates.js';

const asTime = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

/** Inclusive overlap check: two ranges clash when they share at least one calendar day. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return asTime(aStart) <= asTime(bEnd) && asTime(aEnd) >= asTime(bStart);
}

export function findConflict(range, existing = []) {
  return existing.find((r) => rangesOverlap(range.start, range.end, r.start, r.end)) || null;
}

/**
 * Decide whether a date range can be booked.
 * `blocked` are host-defined blackout ranges, `booked` are accepted / confirmed bookings.
 */
export function checkAvailability(range, { blocked = [], booked = [] } = {}) {
  if (findConflict(range, blocked)) return { available: false, reason: 'blocked' };
  if (findConflict(range, booked)) return { available: false, reason: 'booked' };
  return { available: true, reason: null };
}

/** Expand ranges to a sorted list of unique 'YYYY-MM-DD' strings (handy for calendars and tests). */
export function expandRanges(ranges = []) {
  const days = new Set();
  for (const r of ranges) {
    for (let t = asTime(r.start); t <= asTime(r.end); t += 86400000) days.add(toDateOnly(new Date(t)));
  }
  return [...days].sort();
}
