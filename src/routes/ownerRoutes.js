import { Router } from 'express';
import { ownerBookings } from '../controllers/bookingController.js';
import { ownerCars, ownerEarnings, ownerStats, ownerTransactions } from '../controllers/ownerController.js';
import { ownerReviews } from '../controllers/reviewController.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingListQuery } from '../validators/index.js';

const router = Router();
router.use(requireAuth, requireHost);

router.get('/cars', ownerCars);
router.get('/stats', ownerStats);
router.get('/bookings', validate({ query: bookingListQuery }), ownerBookings);
router.get('/earnings', ownerEarnings);
router.get('/transactions', ownerTransactions);
router.get('/reviews', ownerReviews);

export default router;
