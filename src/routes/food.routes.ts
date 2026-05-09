import { Router } from "express";

import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/globalCategories.controller";
import { upload } from "../middleware/upload";
import { getActiveOrders, getOrders } from "../controllers/food.controller";
import { assignCourierToOrder, calculateDeliveryFee, createFoodOrder, getOrderStatus, updateOrderStatus } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/order-food", requireAuth, createFoodOrder);
router.get("/orders/active", requireAuth, getActiveOrders);
router.post("/orders/:orderId/status", requireAuth, updateOrderStatus);
router.get("/orders/:orderId/status", requireAuth, getOrderStatus);
router.post("/orders/:orderId/assign-courier", requireAuth, assignCourierToOrder);
router.get("/orders", requireAuth, getOrders);
router.get("/categories", listCategories);
router.post("/categories", requireAuth, upload.single("image"), createCategory);
router.patch("/categories/:id", requireAuth, upload.single("image"), updateCategory);
router.delete("/categories/:id", requireAuth, deleteCategory);
router.post("/delivery-fee", calculateDeliveryFee);

export default router;