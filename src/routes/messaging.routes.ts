import { Router } from "express";
import { getTemplates, sendMessage } from "../controllers/messaging.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/templates", requireAuth, getTemplates);
router.post("/send", requireAuth, sendMessage);

export default router;
