import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

export const COMPLAINT_CATEGORIES = ['booking', 'payment', 'vehicle', 'host', 'renter', 'safety', 'other'];
export const COMPLAINT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'];

const complaintSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    car: { type: Schema.Types.ObjectId, ref: 'Car' },
    category: { type: String, enum: COMPLAINT_CATEGORIES, default: 'other' },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'open', index: true },
    adminResponse: { type: String, default: '', trim: true, maxlength: 2000 },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date,
  },
  { timestamps: true },
);

normalizeJSON(complaintSchema);

export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
