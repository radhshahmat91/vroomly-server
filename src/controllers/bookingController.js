import { env } from '../config/env.js';
import { refundPayment } from './paymentController.js';
import { Booking, OCCUPYING_STATUSES } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { checkAvailability } from '../utils/availability.js';
import { addDays, countDays, parseDateOnly, todayUTC } from '../utils/dates.js';
import { buildMeta, getPagination } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';
import { calcPricing } from '../utils/pricing.js';
import { sweepBookings } from '../utils/bookingSweeper.js';
import { BOOKING_POPULATE } from '../utils/populate.js';

const money = (n) => `$${Number(n).toFixed(2)}`;
const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

function statusFilter(raw) {
  if (!raw || raw === 'all') return undefined;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? { $in: list } : undefined;
}

async function listFor(field, req, res) {
  await sweepBookings().catch(() => {});
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 10, maxLimit: 50 });
  const filter = { [field]: req.user._id };
  const status = statusFilter(q.status);
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(BOOKING_POPULATE),
    Booking.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

/** GET /api/bookings/mine — the signed-in renter's trips. */
export const myBookings = (req, res) => listFor('renter', req, res);
/** GET /api/owner/bookings — requests for the signed-in host's cars. */
export const ownerBookings = (req, res) => listFor('owner', req, res);

/** GET /api/bookings/summary — counts and "needs attention" items for the renter dashboard. */
export async function bookingSummary(req, res) {
  await sweepBookings().catch(() => {});
  const renter = req.user._id;
  const [byStatus, next, toPay, toReview] = await Promise.all([
    Booking.aggregate([{ $match: { renter } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.findOne({ renter, status: 'confirmed', endDate: { $gte: todayUTC() } }).sort({ startDate: 1 }).populate(BOOKING_POPULATE),
    Booking.find({ renter, status: 'accepted' }).sort({ startDate: 1 }).limit(3).populate(BOOKING_POPULATE),
    Booking.find({ renter, status: 'completed', reviewed: false }).sort({ endDate: -1 }).limit(3).populate(BOOKING_POPULATE),
  ]);
  const counts = { pending: 0, accepted: 0, confirmed: 0, completed: 0, rejected: 0, cancelled: 0 };
  byStatus.forEach((r) => {
    counts[r._id] = r.count;
  });
  res.json({ data: { counts, next, toPay, toReview } });
}

/** GET /api/bookings/:id */
export async function getBooking(req, res) {
  const booking = await Booking.findById(req.params.id).populate(BOOKING_POPULATE);
  if (!booking) throw new ApiError(404, 'We could not find that booking.');
  const allowed = same(booking.renter, req.user._id) || same(booking.owner, req.user._id) || req.user.role === 'admin';
  if (!allowed) throw new ApiError(403, 'You do not have access to this booking.');
  res.json({ data: booking });
}

/** POST /api/bookings — request to book (host must accept before payment). */
export async function createBooking(req, res) {
  const { carId, startDate, endDate, message } = req.body;
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) throw new ApiError(400, 'Please pick valid dates.');
  if (end < start) throw new ApiError(400, 'The return date must be on or after the pick-up date.');
  // One day of tolerance so renters west of UTC can still book "today".
  if (start < addDays(todayUTC(), -1)) throw new ApiError(400, 'The pick-up date cannot be in the past.');
  const days = countDays(start, end);
  if (days > 90) throw new ApiError(400, 'Bookings are limited to 90 days. Please pick a shorter range.');

  const car = await Car.findById(carId);
  if (!car || car.status !== 'approved') throw new ApiError(404, 'This car is not available for booking.');
  if (same(car.owner, req.user._id)) throw new ApiError(400, 'You cannot book your own car.');
  const host = await User.findById(car.owner).select('status name');
  if (!host || host.status === 'suspended') throw new ApiError(409, 'This host is not accepting bookings right now.');

  const occupied = await Booking.find({
    car: car._id,
    status: { $in: OCCUPYING_STATUSES },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).select('startDate endDate');
  const result = checkAvailability(
    { start, end },
    { blocked: car.blockedDates, booked: occupied.map((b) => ({ start: b.startDate, end: b.endDate })) },
  );
  if (!result.available) {
    throw new ApiError(
      409,
      result.reason === 'blocked'
        ? 'The host is not offering this car on some of those dates. Try different dates.'
        : 'Those dates are already booked. Try different dates.',
    );
  }

  const duplicate = await Booking.exists({
    car: car._id,
    renter: req.user._id,
    status: { $in: ['pending', 'accepted', 'confirmed'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (duplicate) throw new ApiError(409, 'You already have a booking request for these dates.');

  const pricing = calcPricing({
    pricePerDay: car.pricePerDay,
    days,
    weeklyDiscount: car.weeklyDiscount,
    monthlyDiscount: car.monthlyDiscount,
    commissionRate: env.PLATFORM_COMMISSION,
  });

  const booking = await Booking.create({
    car: car._id,
    renter: req.user._id,
    owner: car.owner,
    startDate: start,
    endDate: end,
    days,
    pricing,
    message,
    status: 'pending',
  });

  await notify(car.owner, {
    type: 'booking_request',
    title: 'New booking request',
    message: `${req.user.name} wants to book ${car.title} for ${days} day${days > 1 ? 's' : ''} (${money(pricing.ownerEarning)} after fees).`,
    link: '/owner/bookings',
  });

  await booking.populate(BOOKING_POPULATE);
  res.status(201).json({ data: booking });
}

async function loadAsHost(req) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'We could not find that booking.');
  if (!same(booking.owner, req.user._id)) throw new ApiError(403, 'Only the host of this car can do that.');
  return booking;
}

/** PATCH /api/bookings/:id/accept — also auto-declines overlapping pending requests. */
export async function acceptBooking(req, res) {
  const booking = await loadAsHost(req);
  if (booking.status !== 'pending') throw new ApiError(409, 'This request has already been answered.');

  const taken = await Booking.exists({
    _id: { $ne: booking._id },
    car: booking.car,
    status: { $in: OCCUPYING_STATUSES },
    startDate: { $lte: booking.endDate },
    endDate: { $gte: booking.startDate },
  });
  if (taken) throw new ApiError(409, 'Those dates were just taken by another booking. Please decline this request.');

  const car = await Car.findById(booking.car);
  const blocked = checkAvailability({ start: booking.startDate, end: booking.endDate }, { blocked: car?.blockedDates || [] });
  if (!blocked.available) throw new ApiError(409, 'You blocked some of these dates. Unblock them first or decline the request.');

  const accepted = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'pending' },
    { status: 'accepted', respondedAt: new Date() },
    { new: true },
  );
  if (!accepted) throw new ApiError(409, 'This request has already been answered.');

  const clashing = await Booking.find({
    _id: { $ne: booking._id },
    car: booking.car,
    status: 'pending',
    startDate: { $lte: booking.endDate },
    endDate: { $gte: booking.startDate },
  });
  for (const other of clashing) {
    other.status = 'rejected';
    other.respondedAt = new Date();
    other.cancelledBy = 'system';
    other.cancelReason = 'The host accepted another request for overlapping dates.';
    await other.save();
    await notify(other.renter, {
      type: 'booking_rejected',
      title: 'Request declined',
      message: `${car?.title ?? 'This car'} is no longer free on those dates because the host accepted another request.`,
      link: '/dashboard/bookings?tab=cancelled',
    });
  }

  await notify(accepted.renter, {
    type: 'booking_accepted',
    title: 'Your request was accepted',
    message: `${car?.title ?? 'Your car'} is yours if you pay ${money(accepted.pricing.total)} to confirm the trip.`,
    link: `/checkout/${accepted.id}`,
  });

  await accepted.populate(BOOKING_POPULATE);
  res.json({ data: accepted, meta: { autoDeclined: clashing.length } });
}

/** PATCH /api/bookings/:id/reject */
export async function rejectBooking(req, res) {
  const booking = await loadAsHost(req);
  if (booking.status !== 'pending') throw new ApiError(409, 'This request has already been answered.');
  booking.status = 'rejected';
  booking.respondedAt = new Date();
  booking.cancelledBy = 'owner';
  booking.cancelReason = req.body.reason;
  await booking.save();

  const car = await Car.findById(booking.car).select('title');
  await notify(booking.renter, {
    type: 'booking_rejected',
    title: 'Request declined',
    message: `The host declined your request for ${car?.title ?? 'the car'}.${req.body.reason ? ` Reason: ${req.body.reason}` : ''}`,
    link: '/dashboard/bookings?tab=cancelled',
  });
  await booking.populate(BOOKING_POPULATE);
  res.json({ data: booking });
}

/** PATCH /api/bookings/:id/cancel — renter (any time before the trip) or host (accepted / confirmed). */
export async function cancelBooking(req, res) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'We could not find that booking.');
  const isRenter = same(booking.renter, req.user._id);
  const isHost = same(booking.owner, req.user._id);
  if (!isRenter && !isHost) throw new ApiError(403, 'You do not have access to this booking.');
  if (!['pending', 'accepted', 'confirmed'].includes(booking.status)) {
    throw new ApiError(409, 'This booking can no longer be cancelled.');
  }
  if (isHost && booking.status === 'pending') throw new ApiError(409, 'Use "Decline" for requests that are still pending.');
  if (booking.status === 'confirmed' && booking.startDate < todayUTC()) {
    throw new ApiError(409, 'The trip has already started, so it cannot be cancelled.');
  }

  const wasPaid = booking.paymentStatus === 'paid';
  if (wasPaid) await refundPayment(booking);

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = isRenter ? 'renter' : 'owner';
  booking.cancelReason = req.body.reason;
  await booking.save();

  const car = await Car.findById(booking.car).select('title');
  await notify(isRenter ? booking.owner : booking.renter, {
    type: 'booking_cancelled',
    title: 'Booking cancelled',
    message: `${isRenter ? 'The renter' : 'The host'} cancelled the booking for ${car?.title ?? 'the car'}.${wasPaid && !isRenter ? ' You were refunded in full.' : ''}`,
    link: isRenter ? '/owner/bookings' : '/dashboard/bookings?tab=cancelled',
  });

  await booking.populate(BOOKING_POPULATE);
  res.json({ data: booking, meta: { refunded: wasPaid } });
}

/** PATCH /api/bookings/:id/complete — host marks a started trip as finished. */
export async function completeBooking(req, res) {
  const booking = await loadAsHost(req);
  if (booking.status !== 'confirmed') throw new ApiError(409, 'Only paid, confirmed trips can be completed.');
  if (booking.startDate > todayUTC()) throw new ApiError(409, 'You can complete a trip once its pick-up date has arrived.');

  booking.status = 'completed';
  booking.completedAt = new Date();
  await booking.save();
  await Car.updateOne({ _id: booking.car }, { $inc: { tripsCount: 1 } });

  await notify(booking.renter, {
    type: 'booking_completed',
    title: 'Trip completed — leave a review',
    message: 'Your trip is marked as complete. Share how it went to help other renters.',
    link: '/dashboard/bookings?tab=completed',
  });
  await booking.populate(BOOKING_POPULATE);
  res.json({ data: booking });
}
