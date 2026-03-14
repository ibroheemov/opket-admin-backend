import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { loginRestaurantOwner } from '../controllers/restaurants.controller';

const router = Router();

router.post('/login', login);
router.post('/login-restaurant', loginRestaurantOwner);

export default router;
