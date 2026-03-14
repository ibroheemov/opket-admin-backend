import { Router } from "express";

import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/globalCategories.controller";
import { upload } from "../middleware/upload";
import { getOrders, orderFood } from "../controllers/food.controller";
import { calculateDeliveryFee, createFoodOrder, updateOrderStatus } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/requireAuth";


const router = Router();

router.post("/order-food", requireAuth, createFoodOrder);
router.post("/orders/:orderId/status", requireAuth, updateOrderStatus);
router.get("/orders", requireAuth, getOrders);
router.get("/categories", requireAuth, listCategories);
router.post("/categories", requireAuth, upload.single("image"), createCategory);
router.patch("/categories/:id", requireAuth, upload.single("image"), updateCategory);
router.delete("/categories/:id", requireAuth, deleteCategory);
router.post("/delivery-fee", calculateDeliveryFee);

export default router;