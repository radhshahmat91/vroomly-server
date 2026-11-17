import { Booking } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { todayUTC } from './dates.js';
import { notify } from './notifications.js';

/**
 * Housekeeping that keeps booking statuses honest without a scheduler service:
 *  - confirmed trips whose end date has passed become "completed" (and unlock reviews)
 *  - pending / accepted requests whose start date has passed expire
 */
export async function sweepBookings() {
  const today = todayUTC();
  let completed = 0;
  let expired = 0;

  const finished = await Booking.find({ status: 'confirmed', endDate: { $lt: today } });
  for (const booking of finished) {
    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();
    await Car.updateOne({ _id: booking.car }, { $inc: { tripsCount: 1 } });
    await notify(booking.renter, {
      type: 'booking_completed',
      title: 'How was your trip?',
      message: 'Your trip is complete. Leave a review to help the next renter.',
      link: '/dashboard/bookings?tab=completed',
    });
    completed += 1;
  }

  const stale = await Booking.find({ status: { $in: ['pending', 'accepted'] }, startDate: { $lt: today } });
  for (const booking of stale) {
    booking.status = 'cancelled';
    booking.cancelledBy = 'system';
    booking.cancelledAt = new Date();
    booking.cancelReason = 'The request expired because the pick-up date passed.';
    await booking.save();
    await notify(booking.renter, {
      type: 'booking_cancelled',
      title: 'Request expired',
      message: 'Your booking request expired because the pick-up date passed.',
      link: '/dashboard/bookings?tab=cancelled',
    });
    expired += 1;
  }

  return { completed, expired };
}
