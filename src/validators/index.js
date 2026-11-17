import { z } from 'zod';
import { CATEGORIES, FUEL_TYPES, TRANSMISSIONS } from '../models/Car.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../models/Complaint.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'That id is not valid');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like 2026-12-31');
const httpUrl = z
  .string()
  .trim()
  .refine((u) => /^https?:\/\/\S+$/i.test(u), 'Enter a valid http(s) link');

/** Query-string numbers: '' and missing values become undefined. */
const qNum = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().optional());
const qStr = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(100).optional());

export const carListQuery = z.object({
  search: qStr,
  brand: qStr,
  category: z.preprocess((v) => (v === '' ? undefined : v), z.enum(CATEGORIES).optional()),
  city: qStr,
  fuelType: z.preprocess((v) => (v === '' ? undefined : v), z.enum(FUEL_TYPES).optional()),
  transmission: z.preprocess((v) => (v === '' ? undefined : v), z.enum(TRANSMISSIONS).optional()),
  seats: qNum,
  minPrice: qNum,
  maxPrice: qNum,
  lat: qNum,
  lng: qNum,
  radius: qNum,
  startDate: z.preprocess((v) => (v === '' ? undefined : v), dateStr.optional()),
  endDate: z.preprocess((v) => (v === '' ? undefined : v), dateStr.optional()),
  sort: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['recommended', 'price_asc', 'price_desc', 'rating', 'newest']).default('recommended')),
  page: qNum,
  limit: qNum,
});

export const carBody = z.object({
  brand: z.string().trim().min(2, 'Brand must be at least 2 characters').max(40),
  model: z.string().trim().min(1, 'Model is required').max(60),
  year: z.coerce.number().int().min(1950, 'Year must be 1950 or later').max(new Date().getFullYear() + 1),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(20, 'Describe the car in at least 20 characters').max(2000),
  pricePerDay: z.coerce.number().min(5, 'Daily price must be at least $5').max(5000),
  weeklyDiscount: z.coerce.number().min(0).max(60).default(0),
  monthlyDiscount: z.coerce.number().min(0).max(80).default(0),
  seats: z.coerce.number().int().min(1).max(15),
  doors: z.coerce.number().int().min(2).max(6).optional(),
  fuelType: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  features: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  images: z
    .array(z.object({ url: httpUrl, publicId: z.string().optional() }))
    .min(1, 'Add at least one photo')
    .max(10, 'You can add up to 10 photos'),
  city: z.string().trim().min(2, 'City is required').max(60),
  address: z.string().trim().max(160).default(''),
  country: z.string().trim().max(60).default(''),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const blockedBody = z.object({
  start: dateStr,
  end: dateStr,
  reason: z.string().trim().max(140).default(''),
});

export const bookingCreateBody = z.object({
  carId: objectId,
  startDate: dateStr,
  endDate: dateStr,
  message: z.string().trim().max(500).default(''),
});

export const bookingListQuery = z.object({
  status: qStr,
  page: qNum,
  limit: qNum,
});

export const reasonBody = z.object({ reason: z.string().trim().max(300).default('') });

export const paymentIntentBody = z.object({ bookingId: objectId });
export const paymentConfirmBody = z.object({
  bookingId: objectId,
  paymentIntentId: z.string().optional(),
  demo: z.boolean().optional(),
});

export const reviewCreateBody = z.object({
  bookingId: objectId,
  rating: z.coerce.number().int().min(1, 'Choose a star rating').max(5),
  comment: z.string().trim().min(10, 'Tell us a bit more (at least 10 characters)').max(1200),
});
export const reviewReplyBody = z.object({ text: z.string().trim().min(2, 'Write a reply').max(800) });

export const complaintBody = z.object({
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters').max(120),
  description: z.string().trim().min(15, 'Please describe the problem in at least 15 characters').max(2000),
  category: z.enum(COMPLAINT_CATEGORIES).default('other'),
  bookingId: objectId.optional(),
});

export const profileBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(400).optional(),
  image: httpUrl.optional(),
});

export const hostApplyBody = z.object({
  phone: z.string().trim().min(6, 'Enter a phone number we can reach you on').max(30),
  city: z.string().trim().min(2, 'City is required').max(60),
  about: z.string().trim().min(20, 'Tell us a little about yourself and your car (20+ characters)').max(800),
});

export const listQuery = z.object({
  search: qStr,
  status: qStr,
  role: qStr,
  hostStatus: qStr,
  page: qNum,
  limit: qNum,
});

export const userStatusBody = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().trim().max(300).default(''),
});
export const hostDecisionBody = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).default(''),
});
export const carModerationBody = z.object({
  action: z.enum(['approve', 'reject', 'remove', 'restore']),
  note: z.string().trim().max(300).default(''),
});
export const complaintUpdateBody = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  adminResponse: z.string().trim().max(2000).default(''),
});
export const reportQuery = z.object({
  months: qNum,
  format: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['json', 'csv']).default('json')),
});
