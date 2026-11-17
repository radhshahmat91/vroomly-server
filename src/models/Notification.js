import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
  'booking_request',
  'booking_accepted',
  'booking_rejected',
  'booking_cancelled',
  'booking_confirmed',
  'booking_completed',
  'payment_received',
  'review_received',
  'review_reply',
  'car_approved',
  'car_rejected',
  'host_approved',
  'host_rejected',
  'host_application',
  'complaint_update',
  'account',
  'system',
];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
normalizeJSON(notificationSchema);

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
