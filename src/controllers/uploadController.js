import { cloudinaryReady, uploadBuffer } from '../config/cloudinary.js';
import { ApiError } from '../utils/apiError.js';

/** POST /api/uploads/images (multipart, field "images", up to 8) */
export async function uploadCarImages(req, res) {
  if (!req.files?.length) throw new ApiError(400, 'Choose at least one photo to upload.');
  if (!cloudinaryReady) {
    throw new ApiError(503, 'Photo uploads are not set up on this server yet. Paste image links instead.');
  }
  const uploaded = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer, { folder: 'vroomly/cars' })));
  res.status(201).json({ data: uploaded });
}
