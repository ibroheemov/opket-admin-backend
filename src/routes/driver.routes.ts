import express from "express";
import { approveDriverDocuments, rejectDriverDocuments, resetDocumentStatus, getAllOnlineDrivers, getDriverById, getDrivers, updateDriver } from "../controllers/driver.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/", requireAuth, getDrivers);
router.get("/online-drivers", requireAuth, getAllOnlineDrivers);
router.get("/:id", requireAuth, getDriverById);
router.patch("/:id", requireAuth, updateDriver);
router.post("/:id/approve-documents", requireAuth, approveDriverDocuments);
router.post("/:id/reject-documents", requireAuth, rejectDriverDocuments);
router.post("/:id/reset-document-status", requireAuth, resetDocumentStatus);

export default router;
