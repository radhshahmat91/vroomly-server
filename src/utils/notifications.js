import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitToUser } from '../sockets/index.js';

/**
 * Persist an in-app notification and push it to the user over Socket.IO.
 * Never throws — a failed notification must not break the action that triggered it.
 */
export async function notify(userId, { type = 'system', title, message, link = '' }) {
  try {
    const doc = await Notification.create({ user: userId, type, title, message, link });
    emitToUser(userId, 'notification:new', doc.toJSON());
    return doc;
  } catch (err) {
    console.warn('[notify] failed:', err?.message);
    return null;
  }
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  await Promise.all(admins.map((a) => notify(a._id, payload)));
}
