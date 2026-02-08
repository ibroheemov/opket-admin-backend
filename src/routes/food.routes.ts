import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/globalCategories.controller";
import { upload } from "../middleware/upload";


const router = Router();

router.get("/categories", listCategories);
router.post("/categories", authenticate, upload.single("image"), createCategory);
router.patch("/categories/:id", authenticate, upload.single("image"), updateCategory);
router.delete("/categories/:id", authenticate, deleteCategory);

export default router;