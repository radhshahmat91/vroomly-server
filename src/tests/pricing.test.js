import { calcPricing, discountPercentFor } from '../utils/pricing.js';

describe('discountPercentFor', () => {
  const tiers = { weeklyDiscount: 10, monthlyDiscount: 25 };

  test('no discount below a week', () => {
    expect(discountPercentFor(1, tiers)).toBe(0);
    expect(discountPercentFor(6, tiers)).toBe(0);
  });
  test('weekly discount from 7 days', () => {
    expect(discountPercentFor(7, tiers)).toBe(10);
    expect(discountPercentFor(29, tiers)).toBe(10);
  });
  test('monthly discount from 30 days', () => {
    expect(discountPercentFor(30, tiers)).toBe(25);
    expect(discountPercentFor(60, tiers)).toBe(25);
  });
  test('a longer rental is never priced above a shorter one', () => {
    expect(discountPercentFor(30, { weeklyDiscount: 20, monthlyDiscount: 5 })).toBe(20);
  });
});

describe('calcPricing', () => {
  test('simple 3-day rental with commission taken from the host', () => {
    const p = calcPricing({ pricePerDay: 50, days: 3, commissionRate: 0.1 });
    expect(p).toMatchObject({
      days: 3,
      dailyRate: 50,
      subtotal: 150,
      discountPercent: 0,
      discountAmount: 0,
      total: 150,
      platformFee: 15,
      ownerEarning: 135,
    });
  });

  test('weekly discount is applied to the subtotal', () => {
    const p = calcPricing({ pricePerDay: 80, days: 7, weeklyDiscount: 10, monthlyDiscount: 20, commissionRate: 0.1 });
    expect(p.subtotal).toBe(560);
    expect(p.discountPercent).toBe(10);
    expect(p.discountAmount).toBe(56);
    expect(p.total).toBe(504);
    expect(p.platformFee).toBe(50.4);
    expect(p.ownerEarning).toBe(453.6);
  });

  test('monthly discount for a 30 day rental', () => {
    const p = calcPricing({ pricePerDay: 40, days: 30, weeklyDiscount: 10, monthlyDiscount: 25 });
    expect(p.total).toBe(900);
  });

  test('works in whole cents so totals never drift', () => {
    const p = calcPricing({ pricePerDay: 33.33, days: 3, commissionRate: 0.1 });
    expect(p.total).toBe(99.99);
    expect(p.platformFee + p.ownerEarning).toBeCloseTo(p.total, 10);
  });

  test('platform fee + host earning always equals what the renter pays', () => {
    for (const days of [1, 2, 5, 7, 14, 30, 45]) {
      const p = calcPricing({ pricePerDay: 57.77, days, weeklyDiscount: 12, monthlyDiscount: 27, commissionRate: 0.125 });
      expect(Math.round((p.platformFee + p.ownerEarning) * 100)).toBe(Math.round(p.total * 100));
    }
  });

  test('rejects invalid input', () => {
    expect(() => calcPricing({ pricePerDay: 50, days: 0 })).toThrow(RangeError);
    expect(() => calcPricing({ pricePerDay: 50, days: 1.5 })).toThrow(RangeError);
    expect(() => calcPricing({ pricePerDay: 0, days: 2 })).toThrow(RangeError);
  });
});
