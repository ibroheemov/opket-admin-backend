import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getRides } from "../controllers/ride.controller";

const router = express.Router();

router.get("/rides-all", authenticate, getRides);

export default router;
