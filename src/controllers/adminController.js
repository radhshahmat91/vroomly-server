import { Booking, BOOKING_STATUSES } from '../models/Booking.js';
import { Car } from '../models/Car.js';
import { Complaint } from '../models/Complaint.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { buildMeta, escapeRegex, getPagination, lastMonths, round2 } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';
import { BOOKING_POPULATE } from '../utils/populate.js';
import { COMPLAINT_POPULATE } from './complaintController.js';

const same = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);
const cleanStatus = (s) => (s && s !== 'all' ? s : undefined);

/** GET /api/admin/analytics */
export async function analytics(_req, res) {
  const months = lastMonths(12);
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);
  const [renters, hosts, cars, bookings, completed, openComplaints, pendingHosts, pendingCars, revenue, byStatus, monthlyRows] =
    await Promise.all([
      User.countDocuments({ role: 'renter' }),
      User.countDocuments({ role: 'owner' }),
      Car.countDocuments({ status: 'approved' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Complaint.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      User.countDocuments({ hostStatus: 'pending' }),
      Car.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: null, gross: { $sum: '$amount' }, commission: { $sum: '$platformFee' }, payments: { $sum: 1 } } },
      ]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: 'succeeded', paidAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            gross: { $sum: '$amount' },
            commission: { $sum: '$platformFee' },
            bookings: { $sum: 1 },
          },
        },
      ]),
    ]);

  const monthMap = Object.fromEntries(monthlyRows.map((r) => [r._id, r]));
  const statusMap = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));

  res.json({
    data: {
      kpis: {
        users: renters + hosts,
        hosts,
        cars,
        bookings,
        completedTrips: completed,
        grossRevenue: round2(revenue[0]?.gross ?? 0),
        commission: round2(revenue[0]?.commission ?? 0),
        payments: revenue[0]?.payments ?? 0,
      },
      queues: { pendingHosts, pendingCars, openComplaints },
      revenueByMonth: months.map((m) => ({
        month: m,
        gross: round2(monthMap[m]?.gross ?? 0),
        commission: round2(monthMap[m]?.commission ?? 0),
        bookings: monthMap[m]?.bookings ?? 0,
      })),
      bookingsByStatus: BOOKING_STATUSES.map((s) => ({ status: s, count: statusMap[s] ?? 0 })),
    },
  });
}

/** GET /api/admin/users?search=&status=&role= */
export async function listUsers(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 10, maxLimit: 50 });
  const filter = { role: { $ne: 'admin' } };
  if (q.role === 'renter' || q.role === 'owner') filter.role = q.role;
  if (cleanStatus(q.status)) filter.status = q.status;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

/** PATCH /api/admin/users/:id/status — suspend or reinstate. */
export async function setUserStatus(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'We could not find that user.');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be suspended.');
  if (same(user._id, req.user._id)) throw new ApiError(400, 'You cannot suspend yourself.');

  const { status, reason } = req.body;
  user.status = status;
  user.suspendedReason = status === 'suspended' ? reason : '';
  user.updatedAt = new Date();
  await user.save();

  if (user.role === 'owner') {
    if (status === 'suspended') await Car.updateMany({ owner: user._id, status: 'approved' }, { status: 'suspended' });
    else await Car.updateMany({ owner: user._id, status: 'suspended' }, { status: 'approved' });
  }
  if (status === 'active') {
    await notify(user._id, { type: 'account', title: 'Account reinstated', message: 'Your Vroomly account is active again.', link: '/' });
  }
  res.json({ data: user });
}

/** GET /api/admin/owners?hostStatus=pending|approved|rejected */
export async function listOwners(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 10, maxLimit: 50 });
  const filter = { hostStatus: { $ne: 'none' } };
  if (cleanStatus(q.hostStatus)) filter.hostStatus = q.hostStatus;
  if (cleanStatus(q.status)) filter.status = q.status;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total, pending] = await Promise.all([
    User.find(filter).sort({ 'hostProfile.appliedAt': -1, createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
    User.countDocuments({ hostStatus: 'pending' }),
  ]);
  res.json({ data: items, meta: { ...buildMeta(page, limit, total), pending } });
}

/** PATCH /api/admin/owners/:id/decision */
export async function decideHost(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.hostStatus === 'none') throw new ApiError(404, 'We could not find that application.');
  if (user.hostStatus !== 'pending') throw new ApiError(409, 'This application has already been reviewed.');

  const approve = req.body.decision === 'approve';
  user.hostStatus = approve ? 'approved' : 'rejected';
  if (approve) user.role = 'owner';
  user.hostProfile = { ...(user.hostProfile?.toObject?.() ?? {}), reviewedAt: new Date(), reviewNote: req.body.note };
  user.updatedAt = new Date();
  await user.save();

  await notify(user._id, {
    type: approve ? 'host_approved' : 'host_rejected',
    title: approve ? 'You are now a Vroomly host' : 'Host application update',
    message: approve
      ? 'Your application was approved. Add your first car and start earning.'
      : `Your host application was not approved.${req.body.note ? ` Note: ${req.body.note}` : ''}`,
    link: approve ? '/owner/cars/new' : '/become-host',
  });
  res.json({ data: user });
}

/** GET /api/admin/cars?status=&search= */
export async function listAdminCars(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 10, maxLimit: 50 });
  const filter = {};
  if (cleanStatus(q.status)) filter.status = q.status;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: rx }, { brand: rx }, { city: rx }];
  }
  const [items, total, pending] = await Promise.all([
    Car.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', 'name image email'),
    Car.countDocuments(filter),
    Car.countDocuments({ status: 'pending' }),
  ]);
  res.json({ data: items, meta: { ...buildMeta(page, limit, total), pending } });
}

/** PATCH /api/admin/cars/:id/moderate */
export async function moderateCar(req, res) {
  const car = await Car.findById(req.params.id);
  if (!car) throw new ApiError(404, 'We could not find that listing.');
  const { action, note } = req.body;

  const next = { approve: 'approved', restore: 'approved', reject: 'rejected', remove: 'removed' }[action];
  car.status = next;
  car.adminNote = action === 'approve' || action === 'restore' ? '' : note;
  await car.save();

  const approved = next === 'approved';
  await notify(car.owner, {
    type: approved ? 'car_approved' : 'car_rejected',
    title: approved ? 'Your listing is live' : next === 'removed' ? 'Listing removed' : 'Listing needs changes',
    message: approved
      ? `${car.title} was approved and can now be booked.`
      : `${car.title} was ${next === 'removed' ? 'removed' : 'not approved'}.${note ? ` Note: ${note}` : ''}`,
    link: '/owner/cars',
  });
  await car.populate('owner', 'name image email');
  res.json({ data: car });
}

/** GET /api/admin/bookings?status= */
export async function listAdminBookings(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 12, maxLimit: 50 });
  const filter = {};
  if (cleanStatus(q.status)) filter.status = q.status;
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(BOOKING_POPULATE),
    Booking.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

/** GET /api/admin/payments */
export async function listAdminPayments(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 12, maxLimit: 50 });
  const filter = {};
  if (cleanStatus(q.status)) filter.status = q.status;
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('car', 'title')
      .populate('renter', 'name')
      .populate('owner', 'name'),
    Payment.countDocuments(filter),
  ]);
  res.json({ data: items, meta: buildMeta(page, limit, total) });
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** GET /api/admin/reports/revenue?months=12&format=csv */
export async function revenueReport(req, res) {
  const { months: monthsParam, format } = req.valid.query;
  const months = lastMonths(Math.min(Math.max(monthsParam ?? 12, 1), 36));
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);

  const rows = await Payment.aggregate([
    { $match: { paidAt: { $gte: since } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, status: '$status' },
        count: { $sum: 1 },
        gross: { $sum: '$amount' },
        commission: { $sum: '$platformFee' },
        payouts: { $sum: '$ownerEarning' },
      },
    },
  ]);

  const report = months.map((month) => {
    const ok = rows.find((r) => r._id.month === month && r._id.status === 'succeeded');
    const refunded = rows.find((r) => r._id.month === month && r._id.status === 'refunded');
    return {
      month,
      bookings: ok?.count ?? 0,
      gross: round2(ok?.gross ?? 0),
      commission: round2(ok?.commission ?? 0),
      payouts: round2(ok?.payouts ?? 0),
      refunds: round2(refunded?.gross ?? 0),
    };
  });
  const totals = report.reduce(
    (t, r) => ({
      bookings: t.bookings + r.bookings,
      gross: round2(t.gross + r.gross),
      commission: round2(t.commission + r.commission),
      payouts: round2(t.payouts + r.payouts),
      refunds: round2(t.refunds + r.refunds),
    }),
    { bookings: 0, gross: 0, commission: 0, payouts: 0, refunds: 0 },
  );

  if (format === 'csv') {
    const header = ['Month', 'Paid bookings', 'Gross revenue (USD)', 'Platform commission (USD)', 'Host payouts (USD)', 'Refunded (USD)'];
    const lines = [header, ...report.map((r) => [r.month, r.bookings, r.gross.toFixed(2), r.commission.toFixed(2), r.payouts.toFixed(2), r.refunds.toFixed(2)])];
    lines.push(['Total', totals.bookings, totals.gross.toFixed(2), totals.commission.toFixed(2), totals.payouts.toFixed(2), totals.refunds.toFixed(2)]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vroomly-revenue-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(lines.map((l) => l.map(csvCell).join(',')).join('\n'));
  }
  return res.json({ data: { rows: report, totals } });
}

/** GET /api/admin/complaints?status= */
export async function listAdminComplaints(req, res) {
  const q = req.valid.query;
  const { page, limit, skip } = getPagination(q, { defaultLimit: 10, maxLimit: 50 });
  const filter = {};
  if (cleanStatus(q.status)) filter.status = q.status;
  const [items, total, open] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email image role')
      .populate(COMPLAINT_POPULATE),
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ status: { $in: ['open', 'in_review'] } }),
  ]);
  res.json({ data: items, meta: { ...buildMeta(page, limit, total), open } });
}

/** PATCH /api/admin/complaints/:id */
export async function updateComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'We could not find that complaint.');
  complaint.status = req.body.status;
  complaint.adminResponse = req.body.adminResponse;
  complaint.respondedBy = req.user._id;
  complaint.respondedAt = new Date();
  await complaint.save();

  await notify(complaint.user, {
    type: 'complaint_update',
    title: 'Update on your complaint',
    message: `"${complaint.subject}" is now ${complaint.status.replace('_', ' ')}.`,
    link: '/dashboard/complaints',
  });
  await complaint.populate('user', 'name email image role');
  await complaint.populate(COMPLAINT_POPULATE);
  res.json({ data: complaint });
}

