import { Router } from 'express';
import { createComplaint, myComplaints } from '../controllers/complaintController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { complaintBody } from '../validators/index.js';

const router = Router();
router.use(requireAuth);
router.get('/mine', myComplaints);
router.post('/', validate({ body: complaintBody }), createComplaint);

export default router;
