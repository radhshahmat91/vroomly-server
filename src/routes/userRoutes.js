import { Router } from 'express';
import { applyToHost, getMe, updateMe, uploadMyAvatar } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { hostApplyBody, profileBody } from '../validators/index.js';

const router = Router();
router.use(requireAuth);
router.get('/me', getMe);
router.patch('/me', validate({ body: profileBody }), updateMe);
router.post('/me/avatar', uploadAvatar, uploadMyAvatar);
router.post('/me/become-host', validate({ body: hostApplyBody }), applyToHost);

export default router;
