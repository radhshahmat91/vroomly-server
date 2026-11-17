/**
 * Pricing rules
 *  - Rentals of 7+ days get the host's weekly discount, 30+ days the monthly discount.
 *    (A longer rental never ends up cheaper per day than a shorter one: the larger discount wins.)
 *  - The platform keeps a commission from the host's side. The renter pays `total`.
 * All maths is done in integer cents to avoid floating point drift.
 */
export function discountPercentFor(days, { weeklyDiscount = 0, monthlyDiscount = 0 } = {}) {
  if (days >= 30) return Math.max(monthlyDiscount, weeklyDiscount);
  if (days >= 7) return weeklyDiscount;
  return 0;
}

export function calcPricing({ pricePerDay, days, weeklyDiscount = 0, monthlyDiscount = 0, commissionRate = 0.1 }) {
  if (!Number.isInteger(days) || days < 1) throw new RangeError('days must be a whole number of at least 1');
  if (!(pricePerDay > 0)) throw new RangeError('pricePerDay must be greater than 0');

  const dailyCents = Math.round(pricePerDay * 100);
  const subtotal = dailyCents * days;
  const discountPercent = discountPercentFor(days, { weeklyDiscount, monthlyDiscount });
  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discount;
  const platformFee = Math.round(total * commissionRate);
  const ownerEarning = total - platformFee;

  return {
    days,
    dailyRate: dailyCents / 100,
    subtotal: subtotal / 100,
    discountPercent,
    discountAmount: discount / 100,
    total: total / 100,
    platformFee: platformFee / 100,
    ownerEarning: ownerEarning / 100,
  };
}
