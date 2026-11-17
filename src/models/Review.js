import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    car: { type: Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1200 },
    reply: {
      text: { type: String, trim: true, maxlength: 800 },
      repliedAt: Date,
    },
  },
  { timestamps: true },
);

normalizeJSON(reviewSchema);

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
