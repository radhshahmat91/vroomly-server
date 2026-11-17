import { Router } from 'express';
import {
  analytics, decideHost, listAdminBookings, listAdminCars, listAdminComplaints, listAdminPayments, listOwners,
  listUsers, moderateCar, revenueReport, setUserStatus, updateComplaint,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { checkId } from '../middleware/checkId.js';
import { validate } from '../middleware/validate.js';
import {
  carModerationBody, complaintUpdateBody, hostDecisionBody, listQuery, reportQuery, userStatusBody,
} from '../validators/index.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.param('id', checkId);

router.get('/analytics', analytics);
router.get('/users', validate({ query: listQuery }), listUsers);
router.patch('/users/:id/status', validate({ body: userStatusBody }), setUserStatus);
router.get('/owners', validate({ query: listQuery }), listOwners);
router.patch('/owners/:id/decision', validate({ body: hostDecisionBody }), decideHost);
router.get('/cars', validate({ query: listQuery }), listAdminCars);
router.patch('/cars/:id/moderate', validate({ body: carModerationBody }), moderateCar);
router.get('/bookings', validate({ query: listQuery }), listAdminBookings);
router.get('/payments', validate({ query: listQuery }), listAdminPayments);
router.get('/reports/revenue', validate({ query: reportQuery }), revenueReport);
router.get('/complaints', validate({ query: listQuery }), listAdminComplaints);
router.patch('/complaints/:id', validate({ body: complaintUpdateBody }), updateComplaint);

export default router;
