import { Router } from 'express';
import {
  addBlockedDates, carsMeta, createCar, deleteCar, featuredCars, getAvailability, getCar, listCars,
  removeBlockedDates, updateCar,
} from '../controllers/carController.js';
import { optionalAuth, requireAuth, requireHost } from '../middleware/auth.js';
import { checkId } from '../middleware/checkId.js';
import { validate } from '../middleware/validate.js';
import { blockedBody, carBody, carListQuery } from '../validators/index.js';

const router = Router();
router.param('id', checkId);
router.param('blockId', checkId);

router.get('/', validate({ query: carListQuery }), listCars);
router.get('/featured', featuredCars);
router.get('/meta', carsMeta);
router.get('/:id', optionalAuth, getCar);
router.get('/:id/availability', getAvailability);

router.post('/', requireAuth, requireHost, validate({ body: carBody }), createCar);
router.patch('/:id', requireAuth, requireHost, validate({ body: carBody }), updateCar);
router.delete('/:id', requireAuth, requireHost, deleteCar);
router.post('/:id/blocked-dates', requireAuth, requireHost, validate({ body: blockedBody }), addBlockedDates);
router.delete('/:id/blocked-dates/:blockId', requireAuth, requireHost, removeBlockedDates);

export default router;
