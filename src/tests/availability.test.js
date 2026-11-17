import { checkAvailability, expandRanges, findConflict, rangesOverlap } from '../utils/availability.js';
import { countDays, parseDateOnly, toDateOnly } from '../utils/dates.js';

const d = (s) => parseDateOnly(s);
const range = (a, b) => ({ start: d(a), end: d(b) });

describe('dates', () => {
  test('parseDateOnly accepts real dates only', () => {
    expect(toDateOnly(d('2026-12-31'))).toBe('2026-12-31');
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('31/12/2026')).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });
  test('countDays is inclusive of both ends', () => {
    expect(countDays(d('2026-03-10'), d('2026-03-10'))).toBe(1);
    expect(countDays(d('2026-03-10'), d('2026-03-12'))).toBe(3);
    expect(countDays(d('2026-02-27'), d('2026-03-02'))).toBe(4);
  });
});

describe('rangesOverlap (inclusive)', () => {
  test('overlapping ranges', () => {
    expect(rangesOverlap(d('2026-05-01'), d('2026-05-05'), d('2026-05-04'), d('2026-05-08'))).toBe(true);
  });
  test('ranges that share a single day clash', () => {
    expect(rangesOverlap(d('2026-05-01'), d('2026-05-05'), d('2026-05-05'), d('2026-05-08'))).toBe(true);
  });
  test('back-to-back ranges do not clash', () => {
    expect(rangesOverlap(d('2026-05-01'), d('2026-05-05'), d('2026-05-06'), d('2026-05-08'))).toBe(false);
  });
  test('one range fully inside another', () => {
    expect(rangesOverlap(d('2026-05-01'), d('2026-05-31'), d('2026-05-10'), d('2026-05-12'))).toBe(true);
  });
});

describe('checkAvailability', () => {
  const blocked = [range('2026-06-10', '2026-06-12')];
  const booked = [range('2026-06-20', '2026-06-25')];

  test('free dates are available', () => {
    expect(checkAvailability(range('2026-06-01', '2026-06-05'), { blocked, booked })).toEqual({ available: true, reason: null });
  });
  test('blocked dates are rejected with a reason', () => {
    expect(checkAvailability(range('2026-06-09', '2026-06-10'), { blocked, booked })).toEqual({ available: false, reason: 'blocked' });
  });
  test('booked dates are rejected with a reason', () => {
    expect(checkAvailability(range('2026-06-24', '2026-06-28'), { blocked, booked })).toEqual({ available: false, reason: 'booked' });
  });
  test('findConflict returns the clashing range', () => {
    expect(findConflict(range('2026-06-11', '2026-06-11'), blocked)).toBe(blocked[0]);
    expect(findConflict(range('2026-07-01', '2026-07-02'), blocked)).toBeNull();
  });
  test('expandRanges lists every day once, sorted', () => {
    expect(expandRanges([range('2026-06-10', '2026-06-12'), range('2026-06-12', '2026-06-13')])).toEqual([
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
    ]);
  });
});
