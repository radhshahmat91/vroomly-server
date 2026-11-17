import mongoose from 'mongoose';
import { normalizeJSON } from './plugins.js';

const { Schema } = mongoose;

export const CATEGORIES = ['sedan', 'suv', 'hatchback', 'sports', 'luxury', 'convertible', 'offroad', 'van', 'pickup'];
export const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric', 'cng'];
export const TRANSMISSIONS = ['automatic', 'manual'];
export const CAR_STATUSES = ['pending', 'approved', 'rejected', 'removed', 'suspended'];

const imageSchema = new Schema({ url: { type: String, required: true }, publicId: String }, { _id: false });

const blockedSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  reason: { type: String, default: '', trim: true, maxlength: 140 },
});
normalizeJSON(blockedSchema, ['start', 'end']);

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

const carSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    images: { type: [imageSchema], default: [] },
    pricePerDay: { type: Number, required: true, min: 1 },
    weeklyDiscount: { type: Number, default: 0, min: 0, max: 60 },
    monthlyDiscount: { type: Number, default: 0, min: 0, max: 80 },
    seats: { type: Number, required: true, min: 1, max: 15 },
    doors: { type: Number, min: 2, max: 6 },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    transmission: { type: String, enum: TRANSMISSIONS, required: true },
    features: { type: [String], default: [] },
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    location: { type: pointSchema, default: undefined },
    blockedDates: { type: [blockedSchema], default: [] },
    status: { type: String, enum: CAR_STATUSES, default: 'pending', index: true },
    adminNote: { type: String, default: '' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    tripsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

carSchema.index({ location: '2dsphere' });
carSchema.index({ status: 1, pricePerDay: 1 });
carSchema.index({ status: 1, city: 1 });
carSchema.index({ status: 1, ratingAvg: -1 });
normalizeJSON(carSchema);

export const Car = mongoose.models.Car || mongoose.model('Car', carSchema);
