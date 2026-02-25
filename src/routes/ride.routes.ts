import express from "express";
import { getRides } from "../controllers/ride.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/rides-all", requireAuth, getRides);

export default router;
