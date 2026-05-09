import { Request, Response } from "express";
import { MenuItemModel } from "../models/MenuItem";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";
import { OrderFoodTypes } from "../types/food.types";
import { OrderModel, OrderStatus } from "../models/OrderModel";
import { Types } from "mongoose";

const ALL_ORDER_STATUSES: OrderStatus[] = [
    "PLACED",
    "ACCEPTED_BY_RESTAURANT",
    "PREPARING",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "ON_THE_WAY",
    "DELIVERED",
    "CANCELLED_BY_CONSUMER",
    "CANCELLED_BY_RESTAURANT",
    "CANCELLED_NO_COURIER",
];

/** GET /restaurants/:id/items */
export const orderFood = async (req: Request, res: Response) => {
    const { restaurantId, items } = req.body as OrderFoodTypes;

    console.log(restaurantId);
    console.log(items);

    // const { categoryId } = req.query as Record<string, string>;

    // const filter: any = { restaurantId };
    // if (categoryId) filter.categoryId = categoryId;

    // const items = await MenuItemModel.find(filter)
    //     .sort({ sort_order: 1 })
    //     .lean();

    res.json({ success: true });
};

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}

function toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
}

export const getActiveOrders = async (req: Request, res: Response) => {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");
        const userId = req.user.id;
        const by = toObjectId(userId);

        const orders = await OrderModel.find({
            isActive: true,
            consumerId: by,
        })
            .populate({
                path: "restaurantId",
                select: "name phone",
            })
            .populate({
                path: "courierId",
                select: "name phone carModel carColor carNumber regionCode",
            })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            count: orders.length,
            orders,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch orders",
        });
    }
};


export const getOrders = async (req: Request, res: Response) => {
    try {
        const { consumerId, restaurantId, courierId, status, isActive } = req.query;

        const filter: any = {};

        if (consumerId) filter.consumerId = consumerId;
        if (restaurantId) filter.restaurantId = restaurantId;
        if (courierId) filter.courierId = courierId;
        if (status) filter.status = status;
        if (isActive !== undefined) filter.isActive = isActive === "true";

        const orders = await OrderModel.find(filter)
            .populate({
                path: "restaurantId",
                select: "name phone",
            })
            .populate({
                path: "courierId",
                select: "name phone carModel carColor carNumber regionCode",
            })
            .sort({ createdAt: -1 })
            .lean();

        const statusCounts = await OrderModel.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const orderCountByStatus: Record<OrderStatus, number> = ALL_ORDER_STATUSES.reduce(
            (acc, s) => {
                acc[s] = 0;
                return acc;
            },
            {} as Record<OrderStatus, number>
        );

        statusCounts.forEach((item: { _id: OrderStatus; count: number }) => {
            if (item._id in orderCountByStatus) {
                orderCountByStatus[item._id] = item.count;
            }
        });

        return res.json({
            count: orders.length,
            orderCountByStatus,
            orders,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch orders",
        });
    }
};