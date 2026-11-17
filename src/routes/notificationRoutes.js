import { Router } from 'express';
import { listNotifications, markAllRead, markRead, removeNotification } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';
import { checkId } from '../middleware/checkId.js';

const router = Router();
router.use(requireAuth);
router.param('id', checkId);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', removeNotification);

export default router;
