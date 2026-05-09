import { Router } from "express";
import {
    createFoodOrder,
    getOrderById,
    getMyActiveOrder,
    listMyOrders,
    assignCourierToOrder,
    updateOrderStatus,
    cancelOrderByConsumer,
} from "../controllers/order.controller";
import { requireAuth } from "../middleware/requireAuth";

// Your auth middleware that sets req.user
// import { requireAuth } from "../middleware/requireAuth";

export const orderRouter = Router();

// orderRouter.use(requireAuth);

// consumer
orderRouter.post("/orders/food", requireAuth, createFoodOrder);
orderRouter.get("/orders/me/active", getMyActiveOrder);
orderRouter.get("/orders/me", listMyOrders);
orderRouter.get("/orders/:orderId", getOrderById);
orderRouter.post("/orders/:orderId/cancel", cancelOrderByConsumer);
orderRouter.post("/orders/:orderId/cancel", cancelOrderByConsumer);

// courier
orderRouter.post("/orders/:orderId/assign-courier", assignCourierToOrder);

// restaurant/courier/admin
orderRouter.patch("/orders/:orderId/status", updateOrderStatus);