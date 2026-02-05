import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getDriverById, getDrivers, updateDriver } from "../controllers/driver.controller";

const router = express.Router();

router.get("/", authenticate, getDrivers);
router.get("/:id", authenticate, getDriverById);
router.patch("/:id", authenticate, updateDriver);

export default router;
