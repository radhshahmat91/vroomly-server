import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.mimetype)) return cb(null, true);
  return cb(new ApiError(400, 'Only JPG, PNG, WebP or GIF images are allowed.'));
};

const base = { storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 6 * 1024 * 1024, files: 8 } };

export const uploadImages = multer(base).array('images', 8);
export const uploadAvatar = multer({ ...base, limits: { fileSize: 4 * 1024 * 1024, files: 1 } }).single('avatar');
