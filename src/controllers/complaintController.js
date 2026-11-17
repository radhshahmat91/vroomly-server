import { Booking } from '../models/Booking.js';
import { Complaint } from '../models/Complaint.js';
import { ApiError } from '../utils/apiError.js';
import { buildMeta, getPagination } from '../utils/helpers.js';
import { notifyAdmins } from '../utils/notifications.js';

const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

const POPULATE = [
  { path: 'booking', select: 'startDate endDate status car', populate: { path: 'car', select: 'title' } },
  { path: 'car', select: 'title' },
];

/** POST /api/complaints */
export async function createComplaint(req, res) {
  const { bookingId, ...rest } = req.body;
  const data = { ...rest, user: req.user._id };

  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking || !(same(booking.renter, req.user._id) || same(booking.owner, req.user._id))) {
      throw new ApiError(404, 'We could not find that booking.');
    }
    data.booking = booking._id;
    data.car = booking.car;
  }

  const complaint = await Complaint.create(data);
  await notifyAdmins({
    type: 'system',
    title: 'New complaint',
    message: `${req.user.name}: ${complaint.subject}`,
    link: '/admin/complaints',
  });
  await complaint.populate(POPULATE);
  res.status(201).json({ data: complaint });
}

/** GET /api/complaints/mine */
export async function myComplaints(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE),
    Complaint.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

export { POPULATE as COMPLAINT_POPULATE };
