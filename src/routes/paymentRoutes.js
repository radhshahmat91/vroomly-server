import { Router } from 'express';
import { confirmPayment, createIntent } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentConfirmBody, paymentIntentBody } from '../validators/index.js';

const router = Router();
router.use(requireAuth);
router.post('/intent', validate({ body: paymentIntentBody }), createIntent);
router.post('/confirm', validate({ body: paymentConfirmBody }), confirmPayment);

export default router;
