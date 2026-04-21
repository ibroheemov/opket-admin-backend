import { Router } from 'express';
import { createFare, deleteFare, getFareByType, getFares, updateFare } from '../controllers/fare.controller';
import { requireAuth } from '../middleware/requireAuth';


const router = Router();

router.post('/', requireAuth, createFare);
router.get('/', requireAuth, getFares);
router.get('/:type', requireAuth, getFareByType);
router.put('/:id', requireAuth, updateFare);
router.delete('/:id', requireAuth, deleteFare);

export default router;
