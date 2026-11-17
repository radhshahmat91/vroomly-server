import { Router } from 'express';
import { uploadCarImages } from '../controllers/uploadController.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { uploadImages } from '../middleware/upload.js';

const router = Router();
router.post('/images', requireAuth, requireHost, uploadImages, uploadCarImages);

export default router;
