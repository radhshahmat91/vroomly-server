import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    car: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // what the renter paid
    platformFee: { type: Number, required: true }, // Vroomly commission
    ownerEarning: { type: Number, required: true }, // net payout for the host
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: ['succeeded', 'refunded', 'failed'], default: 'succeeded' },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    stripeChargeId: String,
    stripeRefundId: String,
    receiptUrl: String,
    paidAt: { type: Date, default: Date.now },
    refundedAt: Date,
  },
  { timestamps: true },
);

paymentSchema.index({ paidAt: -1 });
normalizeJSON(paymentSchema);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
