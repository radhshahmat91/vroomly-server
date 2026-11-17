const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse 'YYYY-MM-DD' to a Date at 00:00 UTC. Returns null when the input is not a real calendar date. */
export function parseDateOnly(input) {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) return null;
  return d;
}

export const toDateOnly = (value) => new Date(value).toISOString().slice(0, 10);

export function todayUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

/** Number of calendar days a rental occupies — start and end are both inclusive. */
export function countDays(start, end) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}
