import { uploadBuffer, cloudinaryReady } from '../config/cloudinary.js';
import { ApiError } from '../utils/apiError.js';
import { notifyAdmins } from '../utils/notifications.js';

/** GET /api/users/me */
export async function getMe(req, res) {
  res.json({ data: req.user });
}

/** PATCH /api/users/me */
export async function updateMe(req, res) {
  const allowed = ['name', 'phone', 'city', 'bio', 'image'];
  for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  req.user.updatedAt = new Date();
  await req.user.save();
  res.json({ data: req.user });
}

/** POST /api/users/me/avatar (multipart, field "avatar") */
export async function uploadMyAvatar(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload.');
  if (!cloudinaryReady) {
    throw new ApiError(503, 'Photo uploads are not set up on this server yet. Paste an image link instead.');
  }
  const { url } = await uploadBuffer(req.file.buffer, { folder: 'vroomly/avatars' });
  req.user.image = url;
  req.user.updatedAt = new Date();
  await req.user.save();
  res.json({ data: req.user });
}

/** POST /api/users/me/become-host */
export async function applyToHost(req, res) {
  const user = req.user;
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot list cars.');
  if (user.hostStatus === 'approved' || user.role === 'owner') throw new ApiError(409, 'You are already an approved host.');
  if (user.hostStatus === 'pending') throw new ApiError(409, 'Your application is already waiting for review.');

  user.hostStatus = 'pending';
  user.hostProfile = { ...req.body, appliedAt: new Date() };
  if (!user.phone) user.phone = req.body.phone;
  if (!user.city) user.city = req.body.city;
  user.updatedAt = new Date();
  await user.save();

  await notifyAdmins({
    type: 'host_application',
    title: 'New host application',
    message: `${user.name} applied to become a host in ${req.body.city}.`,
    link: '/admin/owners',
  });
  res.status(201).json({ data: user });
}
