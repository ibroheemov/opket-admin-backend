import { Router } from "express";
import {
    getPublicRestaurant,
    createPublicOrder,
    getPublicOrder,
    createPublicReview,
} from "../controllers/public.controller";

const router = Router();

router.get("/r/:slug", getPublicRestaurant);
router.post("/orders", createPublicOrder);
router.get("/orders/:orderId", getPublicOrder);
router.post("/reviews/:orderId", createPublicReview);

export default router;
