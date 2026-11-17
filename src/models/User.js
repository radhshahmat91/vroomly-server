import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

export const ROLES = ['renter', 'owner', 'admin'];
export const HOST_STATUSES = ['none', 'pending', 'approved', 'rejected'];

/**
 * This model maps onto the `user` collection that BetterAuth (running in the Next.js app) owns.
 * BetterAuth creates the document at sign-up; this API only reads it and updates marketplace fields.
 */
const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    role: { type: String, enum: ROLES, default: 'renter' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    suspendedReason: { type: String },
    hostStatus: { type: String, enum: HOST_STATUSES, default: 'none' },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    bio: { type: String, trim: true },
    hostProfile: {
      phone: String,
      city: String,
      about: String,
      appliedAt: Date,
      reviewedAt: Date,
      reviewNote: String,
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { collection: 'user', timestamps: false },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ hostStatus: 1 });
normalizeJSON(userSchema);

export const User = mongoose.models.User || mongoose.model('User', userSchema);

/** Fields that are safe to show to anyone (host cards, reviews, etc.). */
export const PUBLIC_USER_FIELDS = 'name image city bio createdAt';
