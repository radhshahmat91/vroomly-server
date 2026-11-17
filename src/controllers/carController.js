import mongoose from 'mongoose';
import { Booking, OCCUPYING_STATUSES } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { PUBLIC_USER_FIELDS, User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { checkAvailability } from '../utils/availability.js';
import { parseDateOnly, todayUTC, toDateOnly } from '../utils/dates.js';
import { buildMeta, escapeRegex, getPagination, haversineKm, round2 } from '../utils/helpers.js';
import { notifyAdmins } from '../utils/notifications.js';
import { deleteImage } from '../config/cloudinary.js';

const SORTS = {
  recommended: { ratingAvg: -1, ratingCount: -1, createdAt: -1 },
  price_asc: { pricePerDay: 1, _id: 1 },
  price_desc: { pricePerDay: -1, _id: 1 },
  rating: { ratingAvg: -1, ratingCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
};

async function ownerStatsFor(ownerId) {
  const [row] = await Car.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(String(ownerId)), status: 'approved' } },
    {
      $group: {
        _id: null,
        cars: { $sum: 1 },
        trips: { $sum: '$tripsCount' },
        ratingPoints: { $sum: { $multiply: ['$ratingAvg', '$ratingCount'] } },
        ratingCount: { $sum: '$ratingCount' },
      },
    },
  ]);
  return {
    carsCount: row?.cars ?? 0,
    tripsCount: row?.trips ?? 0,
    ratingCount: row?.ratingCount ?? 0,
    ratingAvg: row?.ratingCount ? round2(row.ratingPoints / row.ratingCount) : 0,
  };
}

function applyBody(car, b) {
  car.brand = b.brand;
  car.model = b.model;
  car.year = b.year;
  car.title = `${b.year} ${b.brand} ${b.model}`;
  car.category = b.category;
  car.description = b.description;
  car.pricePerDay = b.pricePerDay;
  car.weeklyDiscount = b.weeklyDiscount;
  car.monthlyDiscount = b.monthlyDiscount;
  car.seats = b.seats;
  car.doors = b.doors;
  car.fuelType = b.fuelType;
  car.transmission = b.transmission;
  car.features = b.features;
  car.images = b.images;
  car.city = b.city;
  car.address = b.address;
  car.country = b.country;
  if (b.lat != null && b.lng != null) car.location = { type: 'Point', coordinates: [b.lng, b.lat] };
}

/** GET /api/cars — public search with filters, sorting and pagination. */
export async function listCars(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 9, maxLimit: 48 });
  const filter = { status: 'approved' };

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: rx }, { brand: rx }, { model: rx }, { city: rx }, { category: rx }, { description: rx }];
  }
  if (q.brand) filter.brand = new RegExp(`^${escapeRegex(q.brand)}$`, 'i');
  if (q.city) filter.city = new RegExp(`^${escapeRegex(q.city)}$`, 'i');
  if (q.category) filter.category = q.category;
  if (q.fuelType) filter.fuelType = q.fuelType;
  if (q.transmission) filter.transmission = q.transmission;
  if (q.seats) filter.seats = { $gte: q.seats };
  if (q.minPrice != null || q.maxPrice != null) {
    filter.pricePerDay = {};
    if (q.minPrice != null) filter.pricePerDay.$gte = q.minPrice;
    if (q.maxPrice != null) filter.pricePerDay.$lte = q.maxPrice;
  }
  const hasGeo = q.lat != null && q.lng != null;
  if (hasGeo) {
    const radiusKm = Math.min(Math.max(q.radius ?? 25, 1), 500);
    filter.location = { $geoWithin: { $centerSphere: [[q.lng, q.lat], radiusKm / 6378.1] } };
  }
  if (q.startDate && q.endDate) {
    const start = parseDateOnly(q.startDate);
    const end = parseDateOnly(q.endDate);
    if (!start || !end || end < start) throw new ApiError(400, 'The return date must be on or after the pick-up date.');
    const takenIds = await Booking.distinct('car', {
      status: { $in: OCCUPYING_STATUSES },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (takenIds.length) filter._id = { $nin: takenIds };
    filter.blockedDates = { $not: { $elemMatch: { start: { $lte: end }, end: { $gte: start } } } };
  }

  const [items, total] = await Promise.all([
    Car.find(filter).sort(SORTS[q.sort]).skip(skip).limit(limit).populate('owner', PUBLIC_USER_FIELDS),
    Car.countDocuments(filter),
  ]);

  const data = items.map((car) => {
    const json = car.toJSON();
    delete json.blockedDates;
    if (hasGeo && car.location?.coordinates?.length === 2) {
      const [lng, lat] = car.location.coordinates;
      json.distanceKm = round2(haversineKm(q.lat, q.lng, lat, lng));
    }
    return json;
  });

  res.json({ data, meta: buildMeta(page, limit, total) });
}

/** GET /api/cars/featured — top rated cars for the landing page. */
export async function featuredCars(_req, res) {
  const cars = await Car.find({ status: 'approved' })
    .sort({ ratingAvg: -1, ratingCount: -1, tripsCount: -1, createdAt: -1 })
    .limit(8)
    .populate('owner', PUBLIC_USER_FIELDS);
  res.json({ data: cars.map((c) => ({ ...c.toJSON(), blockedDates: undefined })) });
}

/** GET /api/cars/meta — values that power the filter UI and the category browser. */
export async function carsMeta(_req, res) {
  const match = { $match: { status: 'approved' } };
  const [brands, cities, categories, fuels, price, total] = await Promise.all([
    Car.distinct('brand', { status: 'approved' }),
    Car.distinct('city', { status: 'approved' }),
    Car.aggregate([match, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Car.aggregate([match, { $group: { _id: '$fuelType', count: { $sum: 1 } } }]),
    Car.aggregate([match, { $group: { _id: null, min: { $min: '$pricePerDay' }, max: { $max: '$pricePerDay' } } }]),
    Car.countDocuments({ status: 'approved' }),
  ]);
  res.json({
    data: {
      totalCars: total,
      brands: brands.sort((a, b) => a.localeCompare(b)),
      cities: cities.sort((a, b) => a.localeCompare(b)),
      categories: Object.fromEntries(categories.map((c) => [c._id, c.count])),
      fuelTypes: Object.fromEntries(fuels.map((c) => [c._id, c.count])),
      priceRange: { min: price[0]?.min ?? 0, max: price[0]?.max ?? 0 },
    },
  });
}

/** GET /api/stats — real marketplace numbers for the landing page. */
export async function publicStats(_req, res) {
  const [cars, hosts, trips, cities] = await Promise.all([
    Car.countDocuments({ status: 'approved' }),
    User.countDocuments({ role: 'owner', status: 'active' }),
    Booking.countDocuments({ status: 'completed' }),
    Car.distinct('city', { status: 'approved' }),
  ]);
  res.json({ data: { cars, hosts, trips, cities: cities.length } });
}

/** GET /api/cars/:id */
export async function getCar(req, res) {
  const car = await Car.findById(req.params.id).populate('owner', PUBLIC_USER_FIELDS);
  if (!car || !car.owner) throw new ApiError(404, 'We could not find that car.');

  const viewer = req.user;
  const isOwner = viewer && String(car.owner._id) === String(viewer._id);
  const isAdmin = viewer?.role === 'admin';
  if (car.status !== 'approved' && !isOwner && !isAdmin) throw new ApiError(404, 'We could not find that car.');

  const json = car.toJSON();
  if (!isOwner && !isAdmin) delete json.blockedDates;
  json.ownerStats = await ownerStatsFor(car.owner._id);
  res.json({ data: json });
}

/** GET /api/cars/:id/availability — dates that cannot be picked in the calendar. */
export async function getAvailability(req, res) {
  const car = await Car.findById(req.params.id).select('blockedDates status');
  if (!car || car.status !== 'approved') throw new ApiError(404, 'We could not find that car.');
  const booked = await Booking.find({
    car: car._id,
    status: { $in: OCCUPYING_STATUSES },
    endDate: { $gte: todayUTC() },
  }).select('startDate endDate');

  res.json({
    data: {
      blocked: car.blockedDates.filter((b) => b.end >= todayUTC()).map((b) => ({ start: toDateOnly(b.start), end: toDateOnly(b.end) })),
      booked: booked.map((b) => ({ start: toDateOnly(b.startDate), end: toDateOnly(b.endDate) })),
    },
  });
}

/** POST /api/cars (approved hosts) */
export async function createCar(req, res) {
  const car = new Car({ owner: req.user._id, status: 'pending' });
  applyBody(car, req.body);
  await car.save();
  await notifyAdmins({
    type: 'system',
    title: 'New listing awaiting review',
    message: `${car.title} was submitted by ${req.user.name}.`,
    link: '/admin/cars',
  });
  res.status(201).json({ data: car });
}

async function loadOwnCar(req) {
  const car = await Car.findById(req.params.id);
  if (!car) throw new ApiError(404, 'We could not find that car.');
  if (String(car.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only manage your own listings.');
  }
  return car;
}

/** PATCH /api/cars/:id */
export async function updateCar(req, res) {
  const car = await loadOwnCar(req);
  const oldImages = car.images.map((i) => i.publicId).filter(Boolean);
  applyBody(car, req.body);
  if (car.status === 'rejected') {
    car.status = 'pending';
    car.adminNote = '';
  }
  await car.save();

  const keep = new Set(car.images.map((i) => i.publicId).filter(Boolean));
  oldImages.filter((id) => !keep.has(id)).forEach((id) => deleteImage(id));

  if (car.status === 'pending') {
    await notifyAdmins({
      type: 'system',
      title: 'Listing resubmitted',
      message: `${car.title} was updated and is waiting for review.`,
      link: '/admin/cars',
    });
  }
  res.json({ data: car });
}

/** DELETE /api/cars/:id */
export async function deleteCar(req, res) {
  const car = await loadOwnCar(req);
  const active = await Booking.exists({
    car: car._id,
    status: { $in: ['pending', 'accepted', 'confirmed'] },
    endDate: { $gte: todayUTC() },
  });
  if (active) {
    throw new ApiError(409, 'This car still has active bookings. Resolve them before deleting the listing.');
  }
  await car.deleteOne();
  car.images.forEach((i) => deleteImage(i.publicId));
  res.json({ message: 'Listing deleted.' });
}

/** POST /api/cars/:id/blocked-dates */
export async function addBlockedDates(req, res) {
  const car = await loadOwnCar(req);
  const start = parseDateOnly(req.body.start);
  const end = parseDateOnly(req.body.end);
  if (!start || !end || end < start) throw new ApiError(400, 'The end date must be on or after the start date.');
  if (end < todayUTC()) throw new ApiError(400, 'Choose dates that have not already passed.');

  const booking = await Booking.exists({
    car: car._id,
    status: { $in: OCCUPYING_STATUSES },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (booking) throw new ApiError(409, 'Some of those dates are already booked by a renter.');

  const clash = checkAvailability({ start, end }, { blocked: car.blockedDates });
  if (!clash.available) throw new ApiError(409, 'Those dates overlap a period you already blocked.');

  car.blockedDates.push({ start, end, reason: req.body.reason });
  await car.save();
  res.status(201).json({ data: car.toJSON().blockedDates });
}

/** DELETE /api/cars/:id/blocked-dates/:blockId */
export async function removeBlockedDates(req, res) {
  const car = await loadOwnCar(req);
  const block = car.blockedDates.id(req.params.blockId);
  if (!block) throw new ApiError(404, 'That blocked period no longer exists.');
  block.deleteOne();
  await car.save();
  res.json({ data: car.toJSON().blockedDates });
}
