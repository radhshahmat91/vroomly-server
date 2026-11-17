import { Booking } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { Review } from '../models/Review.js';
import { ApiError } from '../utils/apiError.js';
import { buildMeta, getPagination, round2 } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

async function refreshCarRating(carId) {
  const [row] = await Review.aggregate([
    { $match: { car: carId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Car.updateOne({ _id: carId }, { ratingAvg: row ? round2(row.avg) : 0, ratingCount: row?.count ?? 0 });
}

/** POST /api/reviews — one review per completed trip. */
export async function createReview(req, res) {
  const { bookingId, rating, comment } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking || !same(booking.renter, req.user._id)) throw new ApiError(404, 'We could not find that trip.');
  if (booking.status !== 'completed') throw new ApiError(409, 'You can review a trip once it is completed.');
  if (booking.reviewed || (await Review.exists({ booking: booking._id }))) {
    throw new ApiError(409, 'You already reviewed this trip.');
  }

  const review = await Review.create({
    booking: booking._id,
    car: booking.car,
    renter: booking.renter,
    owner: booking.owner,
    rating,
    comment,
  });
  booking.reviewed = true;
  await booking.save();
  await refreshCarRating(booking.car);

  const car = await Car.findById(booking.car).select('title');
  await notify(booking.owner, {
    type: 'review_received',
    title: `New ${rating}-star review`,
    message: `${req.user.name} reviewed ${car?.title ?? 'your car'}.`,
    link: '/owner/reviews',
  });

  await review.populate([
    { path: 'renter', select: 'name image' },
    { path: 'car', select: 'title images' },
  ]);
  res.status(201).json({ data: review });
}

/** GET /api/reviews/car/:id — public reviews with a rating summary. */
export async function carReviews(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 6, maxLimit: 30 });
  const car = await Car.findById(req.params.id).select('_id');
  if (!car) throw new ApiError(404, 'We could not find that car.');

  const [items, total, dist] = await Promise.all([
    Review.find({ car: car._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('renter', 'name image'),
    Review.countDocuments({ car: car._id }),
    Review.aggregate([{ $match: { car: car._id } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.forEach((d) => {
    distribution[d._id] = d.count;
  });
  const avg = total ? round2(Object.entries(distribution).reduce((s, [k, v]) => s + Number(k) * v, 0) / total) : 0;

  res.json({ data: items, meta: { ...buildMeta(page, limit, total), average: avg, distribution } });
}

/** GET /api/reviews/featured — recent glowing reviews for the landing page. */
export async function featuredReviews(_req, res) {
  const items = await Review.find({ rating: { $gte: 4 }, $expr: { $gte: [{ $strLenCP: '$comment' }, 40] } })
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('renter', 'name image')
    .populate('car', 'title');
  res.json({ data: items });
}

/** GET /api/reviews/mine — reviews the signed-in renter has written. */
export async function myReviews(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const [items, total] = await Promise.all([
    Review.find({ renter: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('car', 'title images city'),
    Review.countDocuments({ renter: req.user._id }),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

/** GET /api/owner/reviews — reviews on the host's listings. */
export async function ownerReviews(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { owner: req.user._id };
  const [items, total, [summary]] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('renter', 'name image')
      .populate('car', 'title images'),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);
  res.json({
    data: items,
    meta: { ...buildMeta(page, limit, total), average: summary ? round2(summary.avg) : 0 },
  });
}

/** POST /api/reviews/:id/reply — the host answers a review. */
export async function replyToReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'We could not find that review.');
  if (!same(review.owner, req.user._id)) throw new ApiError(403, 'You can only reply to reviews on your own cars.');

  const first = !review.reply?.text;
  review.reply = { text: req.body.text, repliedAt: new Date() };
  await review.save();

  if (first) {
    const car = await Car.findById(review.car).select('title');
    await notify(review.renter, {
      type: 'review_reply',
      title: 'The host replied to your review',
      message: `${req.user.name} responded to your review of ${car?.title ?? 'the car'}.`,
      link: '/dashboard/reviews',
    });
  }
  await review.populate([
    { path: 'renter', select: 'name image' },
    { path: 'car', select: 'title images' },
  ]);
  res.json({ data: review });
}
