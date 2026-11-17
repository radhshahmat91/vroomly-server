import { Router } from 'express';
import { publicStats } from '../controllers/carController.js';
import adminRoutes from './adminRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import carRoutes from './carRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import ownerRoutes from './ownerRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'vroomly-api', time: new Date().toISOString() }));
router.get('/stats', publicStats);

router.use('/cars', carRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/complaints', complaintRoutes);
router.use('/uploads', uploadRoutes);
router.use('/owner', ownerRoutes);
router.use('/admin', adminRoutes);

export default router;
