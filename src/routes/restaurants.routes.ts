import { Router } from "express";
import {
    listRestaurants,
    createRestaurant,
    getRestaurantById,
    updateRestaurant,
    registerFcm,
} from "../controllers/restaurants.controller";
import { upload } from "../middleware/upload";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/", listRestaurants);

router.post("/", requireAuth, upload.single("banner"), createRestaurant);
router.post("/register-fcm", requireAuth, registerFcm);
router.get("/:id", requireAuth, getRestaurantById);
router.patch("/:id",
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "banner", maxCount: 1 },
        { name: "gallery", maxCount: 20 },
    ]), updateRestaurant);

export default router;