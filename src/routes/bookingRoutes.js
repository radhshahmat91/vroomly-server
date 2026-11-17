import { Router } from 'express';
import {
  acceptBooking, bookingSummary, cancelBooking, completeBooking, createBooking, getBooking, myBookings, rejectBooking,
} from '../controllers/bookingController.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { checkId } from '../middleware/checkId.js';
import { validate } from '../middleware/validate.js';
import { bookingCreateBody, bookingListQuery, reasonBody } from '../validators/index.js';

const router = Router();
router.use(requireAuth);
router.param('id', checkId);

router.get('/mine', validate({ query: bookingListQuery }), myBookings);
router.get('/summary', bookingSummary);
router.post('/', validate({ body: bookingCreateBody }), createBooking);
router.get('/:id', getBooking);
router.patch('/:id/accept', requireHost, acceptBooking);
router.patch('/:id/reject', requireHost, validate({ body: reasonBody }), rejectBooking);
router.patch('/:id/cancel', validate({ body: reasonBody }), cancelBooking);
router.patch('/:id/complete', requireHost, completeBooking);

export default router;
