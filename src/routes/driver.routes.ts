import express from "express";
import { getAllOnlineDrivers, getDriverById, getDrivers, updateDriver } from "../controllers/driver.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/", requireAuth, getDrivers);
router.get("/online-drivers", requireAuth, getAllOnlineDrivers);
router.get("/:id", requireAuth, getDriverById);
router.patch("/:id", requireAuth, updateDriver);

export default router;
