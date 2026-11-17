import { Router } from 'express';
import {
  carReviews, createReview, featuredReviews, myReviews, replyToReview,
} from '../controllers/reviewController.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { checkId } from '../middleware/checkId.js';
import { validate } from '../middleware/validate.js';
import { reviewCreateBody, reviewReplyBody } from '../validators/index.js';

const router = Router();
router.param('id', checkId);

router.get('/featured', featuredReviews);
router.get('/car/:id', carReviews);
router.get('/mine', requireAuth, myReviews);
router.post('/', requireAuth, validate({ body: reviewCreateBody }), createReview);
router.post('/:id/reply', requireAuth, requireHost, validate({ body: reviewReplyBody }), replyToReview);

export default router;
