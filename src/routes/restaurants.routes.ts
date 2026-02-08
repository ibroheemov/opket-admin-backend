import { Router } from "express";
import {
    listRestaurants,
    createRestaurant,
    getRestaurantById,
    updateRestaurant,
} from "../controllers/restaurants.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", listRestaurants);
router.post("/", authenticate, upload.single("banner"), createRestaurant);
router.get("/:id", authenticate, getRestaurantById);
router.patch("/:id", authenticate, upload.single("banner"), updateRestaurant);

export default router;