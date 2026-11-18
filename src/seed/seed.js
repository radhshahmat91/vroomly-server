/**
 * Seeds demo data for Vroomly.
 *   npm run seed            reset the demo data, then seed it again
 *   npm run seed:destroy    remove the demo data only
 *
 * Safety: it only runs against a database whose name contains "vroomly" (override with --force).
 *
 * Only users whose email ends with @vroomly.app are touched; real accounts are left alone.
 * Marketplace collections (cars, bookings, reviews, payments, notifications, complaints) are emptied.
 */
import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { Complaint } from '../models/Complaint.js';
import { Notification } from '../models/Notification.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { addDays, todayUTC } from '../utils/dates.js';
import { calcPricing } from '../utils/pricing.js';
import { hashPassword } from '../utils/password.js';
import { PASSWORD, blockedRanges, cars as carDefs, complaints as complaintDefs, completedTrips, ratingByTrip, unreviewedTrip, upcoming, users as userDefs } from './data.js';
import { imgs } from './images.js';

const destroyOnly = process.argv.includes('--destroy');
const today = todayUTC();
const day = (offset) => addDays(today, offset);
const ago = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000);
const fakePi = () => `pi_seed_${crypto.randomBytes(9).toString('hex')}`;

async function destroy() {
  const db = mongoose.connection.db;
  const demoUsers = await db.collection('user').find({ email: /@vroomly\.app$/i }, { projection: { _id: 1 } }).toArray();
  const ids = demoUsers.map((u) => u._id);
  if (ids.length) {
    await db.collection('account').deleteMany({ userId: { $in: ids } });
    await db.collection('session').deleteMany({ userId: { $in: ids } });
    await db.collection('user').deleteMany({ _id: { $in: ids } });
  }
  await Promise.all([Car, Booking, Review, Payment, Notification, Complaint].map((m) => m.deleteMany({})));
  console.log(`[seed] removed ${ids.length} demo users and all marketplace data`);
}

async function createUsers() {
  const db = mongoose.connection.db;
  const passwordHash = await hashPassword(PASSWORD);
  const ids = {};
  let i = 0;
  for (const [key, u] of Object.entries(userDefs)) {
    const createdAt = ago(key === 'admin' ? 400 : u.role === 'owner' ? 280 - i * 10 : 150 - i * 8);
    const _id = new mongoose.Types.ObjectId();
    await db.collection('user').insertOne({
      _id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      image: u.image,
      createdAt,
      updatedAt: createdAt,
      role: u.role,
      status: u.status ?? 'active',
      suspendedReason: u.suspendedReason ?? '',
      hostStatus: u.hostStatus ?? 'none',
      phone: u.phone ?? '',
      city: u.city ?? '',
      bio: u.bio ?? '',
      ...(u.hostProfile ? { hostProfile: { ...u.hostProfile, appliedAt: ago(2) } } : {}),
    });
    // BetterAuth keeps the credential in an `account` document (userId is stored as an ObjectId).
    await db.collection('account').insertOne({
      _id: new mongoose.Types.ObjectId(),
      accountId: String(_id),
      providerId: 'credential',
      userId: _id,
      password: passwordHash,
      createdAt,
      updatedAt: createdAt,
    });
    ids[key] = _id;
    i += 1;
  }
  return ids;
}

async function createCars(userIds) {
  const map = {};
  let i = 0;
  for (const def of carDefs) {
    const car = await Car.create({
      owner: userIds[def.owner],
      title: `${def.year} ${def.brand} ${def.model}`,
      brand: def.brand,
      model: def.model,
      year: def.year,
      category: def.category,
      description: def.description,
      images: imgs(...def.photos),
      pricePerDay: def.pricePerDay,
      weeklyDiscount: def.weeklyDiscount,
      monthlyDiscount: def.monthlyDiscount,
      seats: def.seats,
      doors: def.doors,
      fuelType: def.fuelType,
      transmission: def.transmission,
      features: def.features,
      city: def.where.city,
      address: def.where.address,
      country: def.where.country,
      location: { type: 'Point', coordinates: [def.where.lng, def.where.lat] },
      status: def.status ?? 'approved',
      adminNote: def.adminNote ?? '',
      createdAt: ago(240 - i * 9),
    });
    map[def.key] = car;
    i += 1;
  }
  for (const b of blockedRanges) {
    const car = map[b.car];
    car.blockedDates.push({ start: day(b.start), end: day(b.start + b.days - 1), reason: b.reason });
    await car.save();
  }
  return map;
}

async function makeBooking({ car, renter, userIds, start, days, status, message = '', paid = false, createdAt, extra = {} }) {
  const pricing = calcPricing({
    pricePerDay: car.pricePerDay,
    days,
    weeklyDiscount: car.weeklyDiscount,
    monthlyDiscount: car.monthlyDiscount,
    commissionRate: env.PLATFORM_COMMISSION,
  });
  const startDate = day(start);
  const endDate = day(start + days - 1);
  const booking = await Booking.create({
    car: car._id,
    renter: userIds[renter],
    owner: car.owner,
    startDate,
    endDate,
    days,
    pricing,
    message,
    status,
    paymentStatus: paid ? 'paid' : 'unpaid',
    createdAt: createdAt ?? ago(Math.max(1, -start + 5)),
    respondedAt: status === 'pending' ? undefined : createdAt ?? ago(Math.max(1, -start + 4)),
    ...extra,
  });
  if (paid) {
    const paidAt = extra.paidAt ?? new Date(Math.min(Date.now() - 3600_000, startDate.getTime() - 86400000));
    const pi = fakePi();
    booking.paymentIntentId = pi;
    booking.paidAt = paidAt;
    await booking.save();
    await Payment.create({
      booking: booking._id,
      car: car._id,
      renter: userIds[renter],
      owner: car.owner,
      amount: pricing.total,
      platformFee: pricing.platformFee,
      ownerEarning: pricing.ownerEarning,
      status: 'succeeded',
      stripePaymentIntentId: pi,
      stripeChargeId: `ch_seed_${crypto.randomBytes(8).toString('hex')}`,
      paidAt,
      createdAt: paidAt,
    });
  }
  return booking;
}

async function seedTrips(carMap, userIds) {
  // Completed trips with reviews
  for (const t of completedTrips) {
    const car = carMap[t.car];
    const booking = await makeBooking({
      car, renter: t.renter, userIds, start: t.start, days: t.days, status: 'completed', paid: true, message: '',
      createdAt: ago(-t.start + 6),
      extra: { completedAt: day(t.start + t.days), reviewed: Boolean(t.review) },
    });
    if (t.review) {
      const [comment, reply] = t.review;
      await Review.create({
        booking: booking._id,
        car: car._id,
        renter: userIds[t.renter],
        owner: car.owner,
        rating: ratingByTrip[`${t.car}-${t.renter}`] ?? 5,
        comment,
        ...(reply ? { reply: { text: reply, repliedAt: day(t.start + t.days + 2) } } : {}),
        createdAt: day(t.start + t.days + 1),
      });
    }
  }

  // One finished trip still waiting for the renter's review
  {
    const t = unreviewedTrip;
    await makeBooking({
      car: carMap[t.car], renter: t.renter, userIds, start: t.start, days: t.days, status: 'completed', paid: true,
      createdAt: ago(-t.start + 6), extra: { completedAt: day(t.start + t.days) },
    });
  }

  // Upcoming / in-flight / closed requests
  for (const u of upcoming) {
    const car = carMap[u.car];
    const base = { car, renter: u.renter, userIds, start: u.start, days: u.days, status: u.status, message: u.message ?? '' };
    if (u.status === 'confirmed') {
      await makeBooking({ ...base, paid: true, createdAt: ago(4), extra: { paidAt: ago(2) } });
    } else if (u.status === 'accepted') {
      await makeBooking({ ...base, createdAt: ago(1, 6) });
    } else if (u.status === 'pending') {
      await makeBooking({ ...base, createdAt: ago(0, 3 + u.start) });
    } else if (u.status === 'rejected') {
      await makeBooking({ ...base, createdAt: ago(2), extra: { cancelledBy: 'owner', cancelReason: u.reason, cancelledAt: ago(1) } });
    } else if (u.status === 'cancelled' && u.paidThenRefunded) {
      const booking = await makeBooking({
        ...base, paid: true, createdAt: ago(6),
        extra: { cancelledBy: u.cancelledBy, cancelReason: u.reason, cancelledAt: ago(1), paidAt: ago(5) },
      });
      booking.paymentStatus = 'refunded';
      await booking.save();
      await Payment.updateOne({ booking: booking._id }, { status: 'refunded', refundedAt: ago(1) });
    } else {
      await makeBooking({ ...base, createdAt: ago(3), extra: { cancelledBy: u.cancelledBy, cancelReason: u.reason, cancelledAt: ago(2) } });
    }
  }
}

async function refreshStats(carMap) {
  for (const car of Object.values(carMap)) {
    const [row] = await Review.aggregate([{ $match: { car: car._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    const trips = await Booking.countDocuments({ car: car._id, status: 'completed' });
    await Car.updateOne(
      { _id: car._id },
      { ratingAvg: row ? Math.round(row.avg * 100) / 100 : 0, ratingCount: row?.count ?? 0, tripsCount: trips },
    );
  }
}

async function seedNotifications(userIds, carMap) {
  const mk = (user, type, title, message, link, ageHours, read = false) => ({
    user: userIds[user], type, title, message, link, read, createdAt: ago(0, ageHours),
  });
  await Notification.insertMany([
    mk('noah', 'booking_confirmed', 'Payment received — trip confirmed', `You're all set for ${carMap.tesla3b.title}.`, '/dashboard/bookings?tab=confirmed', 40),
    mk('noah', 'booking_accepted', 'Your request was accepted', `${carMap.amg.title} is yours if you pay to confirm the trip.`, '/dashboard/bookings?tab=accepted', 28),
    mk('noah', 'booking_completed', 'Trip completed — leave a review', 'Your trip is marked as complete. Share how it went to help other renters.', '/dashboard/bookings?tab=completed', 120, true),
    mk('amelia', 'booking_request', 'New booking request', `Olivia Reyes wants to book ${carMap.camaro.title} for 3 days.`, '/owner/bookings', 3),
    mk('amelia', 'booking_request', 'New booking request', `James Carter wants to book ${carMap.camaro.title} for 3 days.`, '/owner/bookings', 2),
    mk('amelia', 'review_received', 'New 5-star review', `Emma Brooks reviewed ${carMap.camaro.title}.`, '/owner/reviews', 90, true),
    mk('emma', 'review_reply', 'The host replied to your review', 'Priya Raman responded to your review of the Nissan Leaf.', '/dashboard/reviews', 50),
    mk('admin', 'host_application', 'New host application', 'Liam Chen applied to become a host in Portland.', '/admin/owners', 46),
    mk('admin', 'system', 'New listing awaiting review', `${carMap.smartCabrio.title} was submitted by Priya Raman.`, '/admin/cars', 30),
    mk('admin', 'system', 'New complaint', 'Noah Walker: Pick-up time changed at the last minute', '/admin/complaints', 20),
  ]);
}

async function seedComplaints(userIds, carMap) {
  for (const c of complaintDefs) {
    const trip = c.trip ? await Booking.findOne({ car: carMap[c.trip]._id, renter: userIds[c.user] }) : null;
    await Complaint.create({
      user: userIds[c.user],
      category: c.category,
      subject: c.subject,
      description: c.description,
      status: c.status,
      adminResponse: c.response ?? '',
      respondedBy: c.response ? userIds.admin : undefined,
      respondedAt: c.response ? ago(1) : undefined,
      booking: trip?._id,
      car: trip?.car,
      createdAt: ago(c.status === 'open' ? 1 : 4),
    });
  }
}

async function main() {
  await connectDB();

  // The seed empties the cars, bookings, reviews, payments, notifications and complaints collections.
  // Refuse to do that in a database that is not obviously Vroomly's (for example one shared with another project).
  const dbName = mongoose.connection.name;
  if (!/vroomly/i.test(dbName) && !process.argv.includes('--force')) {
    console.error(`\n[seed] Refusing to run: the database is "${dbName}", which does not look like a Vroomly database.`);
    console.error('[seed] This script EMPTIES the cars, bookings, reviews, payments, notifications and complaints collections.');
    console.error('[seed] Use a dedicated database: put the name in the connection string (...mongodb.net/vroomly) and set MONGODB_DB=vroomly in BOTH .env files.');
    console.error('[seed] If you really want to use this database, run again with --force.\n');
    process.exitCode = 1;
    return;
  }
  await destroy();
  if (destroyOnly) return;

  const userIds = await createUsers();
  const carMap = await createCars(userIds);
  await seedTrips(carMap, userIds);
  await refreshStats(carMap);
  await seedNotifications(userIds, carMap);
  await seedComplaints(userIds, carMap);

  const counts = {
    users: await User.countDocuments(),
    cars: await Car.countDocuments(),
    bookings: await Booking.countDocuments(),
    payments: await Payment.countDocuments(),
    reviews: await Review.countDocuments(),
    complaints: await Complaint.countDocuments(),
  };
  console.log('[seed] done', counts);
  console.log('\nDemo accounts (password for all: %s)', PASSWORD);
  for (const u of Object.values(userDefs)) console.log(`  ${u.role.padEnd(7)} ${u.email.padEnd(22)} ${u.name}${u.status === 'suspended' ? '  (suspended)' : ''}${u.hostStatus === 'pending' ? '  (host application pending)' : ''}`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
