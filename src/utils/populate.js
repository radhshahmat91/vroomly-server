/** Shared populate presets so list and detail endpoints return the same booking shape. */
export const BOOKING_POPULATE = [
  { path: 'car', select: 'title brand model year images city pricePerDay status' },
  { path: 'renter', select: 'name image' },
  { path: 'owner', select: 'name image' },
];
