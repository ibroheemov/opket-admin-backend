import { Router } from "express";
import { getRideSearchConfig, updateRideSearchConfig } from "../controllers/ride.search.config.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/", requireAuth, getRideSearchConfig);
router.put("/", requireAuth, updateRideSearchConfig);

export default router;
