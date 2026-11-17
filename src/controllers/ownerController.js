import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { buildMeta, getPagination, lastMonths, round2 } from '../utils/helpers.js';
import { todayUTC } from '../utils/dates.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** GET /api/owner/cars */
export async function ownerCars(req, res) {
  const cars = await Car.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ data: cars });
}

/** GET /api/owner/stats — numbers for the host dashboard. */
export async function ownerStats(req, res) {
  const owner = oid(req.user._id);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [byStatus, pendingRequests, upcoming, earnings, month, rating] = await Promise.all([
    Car.aggregate([{ $match: { owner } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.countDocuments({ owner: req.user._id, status: 'pending' }),
    Booking.countDocuments({ owner: req.user._id, status: 'confirmed', endDate: { $gte: todayUTC() } }),
    Payment.aggregate([
      { $match: { owner, status: 'succeeded' } },
      { $group: { _id: null, net: { $sum: '$ownerEarning' }, trips: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { owner, status: 'succeeded', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, net: { $sum: '$ownerEarning' } } },
    ]),
    Review.aggregate([{ $match: { owner } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);

  const listings = { total: 0, approved: 0, pending: 0, rejected: 0 };
  byStatus.forEach((s) => {
    listings.total += s.count;
    if (s._id in listings) listings[s._id] = s.count;
  });

  res.json({
    data: {
      listings,
      pendingRequests,
      upcomingTrips: upcoming,
      earnings: { allTime: round2(earnings[0]?.net ?? 0), thisMonth: round2(month[0]?.net ?? 0), trips: earnings[0]?.trips ?? 0 },
      rating: { average: rating[0] ? round2(rating[0].avg) : 0, count: rating[0]?.count ?? 0 },
    },
  });
}

/** GET /api/owner/earnings — monthly chart data + totals, net of the platform commission. */
export async function ownerEarnings(req, res) {
  const owner = oid(req.user._id);
  const months = lastMonths(12);
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);

  const rows = await Payment.aggregate([
    { $match: { owner, status: 'succeeded', paidAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
        gross: { $sum: '$amount' },
        commission: { $sum: '$platformFee' },
        net: { $sum: '$ownerEarning' },
        trips: { $sum: 1 },
      },
    },
  ]);
  const byMonth = Object.fromEntries(rows.map((r) => [r._id, r]));
  const monthly = months.map((m) => ({
    month: m,
    gross: round2(byMonth[m]?.gross ?? 0),
    commission: round2(byMonth[m]?.commission ?? 0),
    net: round2(byMonth[m]?.net ?? 0),
    trips: byMonth[m]?.trips ?? 0,
  }));
  const totals = monthly.reduce(
    (t, m) => ({ gross: t.gross + m.gross, commission: t.commission + m.commission, net: t.net + m.net, trips: t.trips + m.trips }),
    { gross: 0, commission: 0, net: 0, trips: 0 },
  );
  res.json({
    data: { monthly, totals: { ...totals, gross: round2(totals.gross), commission: round2(totals.commission), net: round2(totals.net) } },
  });
}

/** GET /api/owner/transactions — per-trip earnings table. */
export async function ownerTransactions(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { owner: req.user._id };
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('car', 'title images')
      .populate('renter', 'name image')
      .populate('booking', 'startDate endDate days'),
    Payment.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}
