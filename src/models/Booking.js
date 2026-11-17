import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

export const BOOKING_STATUSES = ['pending', 'accepted', 'confirmed', 'completed', 'rejected', 'cancelled'];
/** Statuses that occupy the car's calendar. */
export const OCCUPYING_STATUSES = ['accepted', 'confirmed'];

const pricingSchema = new Schema(
  {
    dailyRate: Number,
    days: Number,
    subtotal: Number,
    discountPercent: Number,
    discountAmount: Number,
    total: Number,
    platformFee: Number,
    ownerEarning: Number,
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    car: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    pricing: { type: pricingSchema, required: true },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    paymentIntentId: String,
    paidAt: Date,
    respondedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ['renter', 'owner', 'system', 'admin'] },
    cancelReason: { type: String, default: '' },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

bookingSchema.index({ car: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ renter: 1, status: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
normalizeJSON(bookingSchema, ['startDate', 'endDate']);

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
