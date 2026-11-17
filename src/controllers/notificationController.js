import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/apiError.js';
import { buildMeta, getPagination } from '../utils/helpers.js';

/** GET /api/notifications?unread=true&page=&limit= */
export async function listNotifications(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15, maxLimit: 50 });
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ data: items, meta: { ...buildMeta(page, limit, total), unread } });
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req, res) {
  const doc = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!doc) throw new ApiError(404, 'That notification no longer exists.');
  res.json({ data: doc });
}

/** PATCH /api/notifications/read-all */
export async function markAllRead(req, res) {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read.', meta: { updated: result.modifiedCount } });
}

/** DELETE /api/notifications/:id */
export async function removeNotification(req, res) {
  const doc = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!doc) throw new ApiError(404, 'That notification no longer exists.');
  res.json({ message: 'Notification removed.' });
}
