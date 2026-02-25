import { Router } from "express";

import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/globalCategories.controller";
import { upload } from "../middleware/upload";
import { orderFood } from "../controllers/food.controller";
import { createFoodOrder } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/requireAuth";


const router = Router();

router.post("/order-food", requireAuth, createFoodOrder);
router.get("/categories", requireAuth, listCategories);
router.post("/categories", requireAuth, upload.single("image"), createCategory);
router.patch("/categories/:id", requireAuth, upload.single("image"), updateCategory);
router.delete("/categories/:id", requireAuth, deleteCategory);

export default router;