import { Router } from "express";
import {
    getPublicRestaurant,
    createPublicOrder,
    getPublicOrder,
    createPublicReview,
} from "../controllers/public.controller";
import { getAppVersionConfig } from "../models/AppVersionConfigModel";

const router = Router();

router.get("/r/:slug", getPublicRestaurant);
router.post("/orders", createPublicOrder);
router.get("/orders/:orderId", getPublicOrder);
router.post("/reviews/:orderId", createPublicReview);

router.get("/app-version-config/:app", async (req, res) => {
    try {
        const doc = await getAppVersionConfig();
        const app = req.params.app as "passenger" | "driver";

        if (app === "passenger") {
            return res.json({
                min_version: doc.passenger_min_version,
                latest_version: doc.passenger_latest_version,
            });
        }
        if (app === "driver") {
            return res.json({
                min_version: doc.driver_min_version,
                latest_version: doc.driver_latest_version,
            });
        }
        return res.status(400).json({ error: "app must be 'passenger' or 'driver'" });
    } catch (err) {
        console.error("public app-version-config error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

export default router;
