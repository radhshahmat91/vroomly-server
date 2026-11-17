import crypto from 'node:crypto';
import { stripe, demoPaymentsEnabled } from '../config/stripe.js';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/apiError.js';
import { notify } from '../utils/notifications.js';
import { BOOKING_POPULATE } from '../utils/populate.js';

const isSyntheticIntent = (id = '') => /^pi_(demo|seed)_/.test(id);
const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

/** Mark a booking as paid + confirmed and record the payment. Safe to call twice (webhook + confirm). */
export async function finalizePayment(booking, { paymentIntentId, chargeId, receiptUrl }) {
  if (booking.paymentStatus === 'paid') return booking;

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.paidAt = new Date();
  booking.paymentIntentId = paymentIntentId;
  await booking.save();

  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    {
      $setOnInsert: {
        booking: booking._id,
        car: booking.car,
        renter: booking.renter,
        owner: booking.owner,
        amount: booking.pricing.total,
        platformFee: booking.pricing.platformFee,
        ownerEarning: booking.pricing.ownerEarning,
        currency: 'usd',
        status: 'succeeded',
        stripeChargeId: chargeId,
        receiptUrl,
        paidAt: new Date(),
      },
    },
    { upsert: true },
  );

  const car = await Car.findById(booking.car).select('title');
  await Promise.all([
    notify(booking.owner, {
      type: 'payment_received',
      title: 'Booking confirmed and paid',
      message: `${car?.title ?? 'Your car'} is booked. You will earn $${booking.pricing.ownerEarning.toFixed(2)} after the platform fee.`,
      link: '/owner/bookings',
    }),
    notify(booking.renter, {
      type: 'booking_confirmed',
      title: 'Payment received — trip confirmed',
      message: `You're all set for ${car?.title ?? 'your trip'}.`,
      link: '/dashboard/bookings?tab=confirmed',
    }),
  ]);
  return booking;
}

/** Refund the renter in full (used when a paid booking is cancelled). */
export async function refundPayment(booking) {
  const payment = await Payment.findOne({ booking: booking._id, status: 'succeeded' });
  if (payment) {
    if (stripe && !isSyntheticIntent(payment.stripePaymentIntentId)) {
      try {
        const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
        payment.stripeRefundId = refund.id;
      } catch (err) {
        throw new ApiError(502, `We could not process the refund right now: ${err.message}`);
      }
    }
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();
  }
  booking.paymentStatus = 'refunded';
}

async function loadRenterBooking(bookingId, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking || !same(booking.renter, user._id)) throw new ApiError(404, 'We could not find that booking.');
  return booking;
}

/** POST /api/payments/intent */
export async function createIntent(req, res) {
  const booking = await loadRenterBooking(req.body.bookingId, req.user);
  if (booking.paymentStatus === 'paid') throw new ApiError(409, 'This booking has already been paid.');
  if (booking.status !== 'accepted') {
    throw new ApiError(
      409,
      booking.status === 'pending' ? 'The host has not accepted this request yet.' : 'This booking cannot be paid right now.',
    );
  }
  const amount = Math.round(booking.pricing.total * 100);

  if (!stripe) {
    if (demoPaymentsEnabled) return res.json({ data: { demo: true, amount, bookingId: booking.id } });
    throw new ApiError(503, 'Card payments are not set up on this server yet. Add STRIPE_SECRET_KEY to enable them.');
  }

  let intent = null;
  if (booking.paymentIntentId) {
    try {
      intent = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
      if (intent.status === 'succeeded') {
        await finalizePayment(booking, { paymentIntentId: intent.id });
        throw new ApiError(409, 'This booking has already been paid.');
      }
      if (intent.amount !== amount || intent.status === 'canceled') intent = null;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      intent = null;
    }
  }
  if (!intent) {
    intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: `Vroomly booking ${booking.id}`,
      metadata: { bookingId: booking.id, renterId: String(req.user._id) },
    });
    booking.paymentIntentId = intent.id;
    await booking.save();
  }

  res.json({ data: { clientSecret: intent.client_secret, paymentIntentId: intent.id, amount } });
}

/** POST /api/payments/confirm — called by the browser after Stripe says the payment succeeded. */
export async function confirmPayment(req, res) {
  const { bookingId, paymentIntentId, demo } = req.body;
  const booking = await loadRenterBooking(bookingId, req.user);
  if (booking.paymentStatus === 'paid') {
    await booking.populate(BOOKING_POPULATE);
    return res.json({ data: booking });
  }
  if (booking.status !== 'accepted') throw new ApiError(409, 'This booking cannot be paid right now.');

  if (!stripe) {
    if (!(demoPaymentsEnabled && demo)) throw new ApiError(503, 'Card payments are not set up on this server yet.');
    await finalizePayment(booking, { paymentIntentId: `pi_demo_${crypto.randomBytes(8).toString('hex')}` });
  } else {
    if (!paymentIntentId) throw new ApiError(400, 'Missing payment reference.');
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    if (intent.metadata?.bookingId !== booking.id) throw new ApiError(400, 'That payment does not belong to this booking.');
    if (intent.status !== 'succeeded') throw new ApiError(409, `Your payment is ${intent.status.replaceAll('_', ' ')}. Please try again.`);
    if (intent.amount_received !== Math.round(booking.pricing.total * 100)) {
      throw new ApiError(409, 'The amount paid does not match the booking total. Please contact support.');
    }
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    await finalizePayment(booking, { paymentIntentId: intent.id, chargeId: charge?.id, receiptUrl: charge?.receipt_url });
  }

  await booking.populate(BOOKING_POPULATE);
  res.json({ data: booking });
}

/** POST /api/payments/webhook — Stripe -> server confirmation (mounted with a raw body parser). */
export async function stripeWebhook(req, res) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ message: 'Webhook is not configured.' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature check failed: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const booking = intent.metadata?.bookingId ? await Booking.findById(intent.metadata.bookingId) : null;
    if (booking && booking.paymentStatus !== 'paid' && booking.status === 'accepted') {
      await finalizePayment(booking, { paymentIntentId: intent.id });
    }
  }
  return res.json({ received: true });
}
