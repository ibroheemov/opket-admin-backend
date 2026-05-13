import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { OrderModel, OrderStatus } from "../models/OrderModel";
import { RestaurantModel } from "../models/Restaurant";

/** Adjust to your auth typings */
// type Request = Request & {
//     user?: { id: string; role?: "CONSUMER" | "COURIER" | "RESTAURANT" | "ADMIN" };
// };

function isObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
}

function toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
}

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}

function ok(res: Response, data: any) {
    return res.json({ ok: true, data });
}

function pushHistory(params: {
    status: OrderStatus;
    by?: Types.ObjectId;
    note?: string;
}) {
    return {
        status: params.status,
        at: new Date(),
        by: params.by,
        note: params.note,
    };
}

/**
 * POST /orders/food
 * body: { restaurantId, items: [{menuItemId, quantity}], dropoff:{lat,lon} }
 * pickup is taken from RestaurantModel.
 */
export async function createFoodOrder(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const { restaurantId, items, dropoff, itemsSubtotal, deliveryFee } = req.body ?? {};

        if (!restaurantId || !isObjectId(restaurantId)) return bad(res, 400, "Invalid restaurantId");
        if (!Array.isArray(items) || items.length === 0) return bad(res, 400, "Items cannot be empty");

        // Note: don't use `if (!dropoff?.lat || !dropoff?.lon)` because 0 is valid.
        if (
            !dropoff ||
            !Number.isFinite(Number(dropoff.latitude)) ||
            !Number.isFinite(Number(dropoff.longitude))
        ) {
            return bad(res, 400, "Invalid dropoff");
        }

        const dropLat = Number(dropoff.latitude);
        const dropLon = Number(dropoff.longitude);
        if (dropLat < -90 || dropLat > 90 || dropLon < -180 || dropLon > 180) {
            return bad(res, 400, "Dropoff out of range");
        }

        // Validate items
        const normalizedItems: { menuItemId: Types.ObjectId; quantity: number }[] = [];
        for (const it of items) {
            if (!it?.menuItemId || !isObjectId(String(it.menuItemId))) {
                return bad(res, 400, "Invalid menuItemId in items");
            }
            const qty = Number(it.quantity);
            if (!Number.isFinite(qty) || qty < 1) return bad(res, 400, "Invalid quantity in items");
            normalizedItems.push({ menuItemId: toObjectId(String(it.menuItemId)), quantity: qty });
        }

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            // Fetch restaurant pickup coords from DB (source of truth)
            const restaurant = await RestaurantModel.findById(restaurantId)
                .select("status is_open accepting_orders location lat lng ownerUserId delivery") // keep compatible with your schema
                .session(session)
                .lean();

            if (!restaurant) return bad(res, 404, "Restaurant not found");

            // If you use status field in your new scalable model:
            if ((restaurant as any).status && (restaurant as any).status !== "ACTIVE") {
                return bad(res, 409, "Restaurant is not active");
            }

            // If you keep old flags:
            if (restaurant.is_open === false) return bad(res, 409, "Restaurant is closed");
            if ((restaurant as any).accepting_orders === false) return bad(res, 409, "Restaurant not accepting orders");

            // Prefer GeoJSON location if present; otherwise fallback to lat/lng
            let pickupLat: number | null = null;
            let pickupLon: number | null = null;

            const loc = (restaurant as any).location;
            if (loc?.type === "Point" && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
                pickupLon = Number(loc.coordinates[0]);
                pickupLat = Number(loc.coordinates[1]);
            } else if (Number.isFinite((restaurant as any).lat) && Number.isFinite((restaurant as any).lng)) {
                pickupLat = Number((restaurant as any).lat);
                pickupLon = Number((restaurant as any).lng);
            }

            if (pickupLat === null || pickupLon === null) {
                return bad(res, 409, "Restaurant has no pickup location configured");
            }
            console.log("USER ID:", req.user.id);
            const passenger = await PassengerModel.findById(req.user.id).select("phone");

            if (!passenger) {
                return bad(res, 404, "No user found with this id");
            }

            const consumerId = toObjectId(req.user.id);

            // Generate order number
            const { orderNumber, orderDate } = await getNextOrderNumber(restaurantId);

            const { items, pricing } =
                await buildOrderPricing(
                    toObjectId(restaurantId),
                    normalizedItems,
                    { lat: pickupLat, lon: pickupLon },
                    { lat: dropLat, lon: dropLon },
                    restaurant.delivery.free_over_amount,
                );


            const [created] = await OrderModel.create(
                [
                    {
                        pricing,
                        orderNumber,
                        orderDate,
                        restaurantId: toObjectId(restaurantId),
                        consumerId,
                        consumerPhone: passenger.phone,
                        courierId: null,
                        items,
                        dropoff: { latitude: dropLat, longitude: dropLon },
                        pickup: { latitude: pickupLat, longitude: pickupLon },
                        status: "PLACED" as OrderStatus,
                        statusHistory: [pushHistory({ status: "PLACED", by: consumerId })],
                    },
                ],
                { session }
            );

            // populate restaurant
            const order = await created.populate({
                path: "restaurantId",
                select: "name location lat lng ownerUserId",
            });

            console.log(restaurant.ownerUserId);
            console.log(restaurant.ownerUserId.toString());

            const isEmitted2 = await emitToRestaurant(restaurant.ownerUserId.toString(), "food_order", { "title": "Yangi buyurtma", "body": "", "channelKey": "restaurant_channel" })
            const isEmitted = await emitToRestaurant(`${restaurant.ownerUserId.toString()}-bg`, "food_order", { "title": "Yangi buyurtma", "body": "", "channelKey": "restaurant_channel" })
            console.log("food_order", isEmitted, isEmitted2);

            await session.commitTransaction();

            return ok(res, order);
        } catch (e) {
            await session.abortTransaction();
            throw e;
        } finally {
            session.endSession();
        }
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

/**
 * GET /orders/:orderId
 * Access control: only consumer/courier/restaurant involved (or admin).
 */
export async function getOrderById(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const { orderId } = req.params;
        if (!isObjectId(orderId)) return bad(res, 400, "Invalid orderId");

        const order = await OrderModel.findById(orderId).lean();
        if (!order) return bad(res, 404, "Order not found");

        const userId = req.user.id;
        const role = req.user.role;

        const canAccess =
            role === "ADMIN" ||
            String(order.consumerId) === userId ||
            (order.courierId && String(order.courierId) === userId) ||
            String(order.restaurantId) === userId; // NOTE: only true if restaurantId == userId (often false in real apps)

        // In real apps: restaurantId != userId; you'd check restaurant ownerId.
        // Replace this rule with your Restaurant ownership check.

        if (!canAccess) return bad(res, 403, "Forbidden");

        return ok(res, order);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

/**
 * GET /orders/me/active
 * Consumer dashboard: show current active order (latest).
 */
export async function getMyActiveOrder(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const consumerId = toObjectId(req.user.id);

        const order = await OrderModel.findOne({ consumerId, isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        return ok(res, order ?? null);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

/**
 * GET /orders/me
 * Consumer order history (paginated)
 */
export async function listMyOrders(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const consumerId = toObjectId(req.user.id);
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            OrderModel.find({ consumerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            OrderModel.countDocuments({ consumerId }),
        ]);

        return ok(res, { items, total, page, limit });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

/**
 * POST /orders/:orderId/assign-courier
 * Courier accepts/assigns themselves to an order.
 */
export async function assignCourierToOrder(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");
        if (req.user.role && req.user.role !== "COURIER" && req.user.role !== "ADMIN")
            return bad(res, 403, "Only couriers can accept deliveries");

        const { orderId } = req.params;
        if (!isObjectId(orderId)) return bad(res, 400, "Invalid orderId");

        const courierId = toObjectId(req.user.id);

        // Atomic claim: only if courierId is null and order is active
        const order = await OrderModel.findOneAndUpdate(
            { _id: orderId, courierId: null, isActive: true },
            {
                $set: { courierId },
                $push: { statusHistory: pushHistory({ status: "ACCEPTED_BY_RESTAURANT", by: courierId, note: "Courier assigned" }) },
            },
            { new: true }
        );

        if (!order) return bad(res, 409, "Order already assigned or not active");

        return ok(res, order);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

/**
 * PATCH /orders/:orderId/status
 * body: { status: OrderStatus, note?: string }
 * Restaurant or courier updates status.
 */
export async function updateOrderStatus(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const { orderId } = req.params;
        if (!isObjectId(orderId)) return bad(res, 400, "Invalid orderId");

        const { status, note } = req.body ?? {};
        const allowed: OrderStatus[] = [
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

        if (!allowed.includes(status)) return bad(res, 400, "Invalid status");

        const userId = req.user.id;
        const by = toObjectId(userId);

        const order = await OrderModel.findById(orderId).populate({
            path: "restaurantId",
            select: "name phone",
        })
            .populate({
                path: "courierId",
                select: "name phone carModel carColor carNumber regionCode",
            });
        if (!order) return bad(res, 404, "Order not found");

        // Access control (adjust to your domain rules)
        const isCourier = order.courierId && String(order.courierId) === userId;
        const isConsumer = String(order.consumerId) === userId;

        // NOTE: restaurant ownership is usually via Restaurant.ownerId
        const isRestaurant = String(order.restaurantId) === userId;

        const role = req.user.role;
        // const canUpdate =
        //     role === "ADMIN" || role === "RESTAURANT_OWNER" || role === "COURIER" ||
        //     isCourier ||
        //     isRestaurant ||
        //     // optionally allow consumer to mark DELIVERED? usually no
        //     false;

        // if (!canUpdate) return bad(res, 403, "Forbidden");

        // Simple transition rules (tighten as you wish)
        const terminal = new Set<OrderStatus>([
            "DELIVERED",
            "CANCELLED_BY_CONSUMER",
            "CANCELLED_BY_RESTAURANT",
            "CANCELLED_NO_COURIER",
        ]);
        if (terminal.has(order.status)) return bad(res, 409, "Order already finished");

        // Consumer cancellation should go via cancel endpoint
        if (status === "CANCELLED_BY_CONSUMER" && !isConsumer && role !== "ADMIN")
            return bad(res, 403, "Only consumer can cancel their order");

        order.status = status;
        order.statusHistory.push(pushHistory({ status, by, note: typeof note === "string" ? note : undefined }));

        await order.save();
        return ok(res, order);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

export async function getOrderStatus(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const { orderId } = req.params;
        if (!isObjectId(orderId)) return bad(res, 400, "Invalid orderId");

        const order = await OrderModel.findById(orderId).select("status");

        if (!order) return bad(res, 404, "Order not found");

        const status = order.status;

        return ok(res, status);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}


/**
 * POST /orders/:orderId/cancel
 * Consumer cancels if order is not too far along.
 * body: { reason?: string }
 */
export async function cancelOrderByConsumer(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        const { orderId } = req.params;
        if (!isObjectId(orderId)) return bad(res, 400, "Invalid orderId");

        const { reason } = req.body ?? {};
        const consumerId = req.user.id;

        const order = await OrderModel.findById(orderId);
        if (!order) return bad(res, 404, "Order not found");

        if (String(order.consumerId) !== consumerId) return bad(res, 403, "Forbidden");

        // cancellation window rule (adjust)
        const cannotCancelStatuses: OrderStatus[] = ["PICKED_UP", "ON_THE_WAY", "DELIVERED"];
        if (cannotCancelStatuses.includes(order.status)) {
            return bad(res, 409, `Cannot cancel once order is ${order.status}`);
        }

        order.status = "CANCELLED_BY_CONSUMER";
        order.cancelReason = typeof reason === "string" ? reason.slice(0, 300) : undefined;
        order.statusHistory.push(
            pushHistory({
                status: "CANCELLED_BY_CONSUMER",
                by: toObjectId(consumerId),
                note: order.cancelReason,
            })
        );

        await order.save();
        return ok(res, order);
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}

import axios from "axios";
import { DeliveryFeeRequestBody, GoogleRoutesResponse } from "../types/genera.types";
import { config } from "../config/env";
import { haversineDistanceMeters } from "../utils/haversineDistanceMeters";
import { emitToRestaurant } from "../gateway/socket";
import { getNextOrderNumber } from "../utils/getNextOrderNumber";
import { buildOrderPricing } from "../utils/buildOrderPricing";
import { PassengerModel } from "../models/PassengerModel";


export async function calculateDeliveryFee(
    req: Request,
    res: Response
) {
    const {
        origin,
        destination,
        freeOverAmount,
        subtotal,
    } = req.body as DeliveryFeeRequestBody;

    const FIRST_KM = 5000;
    const PER_KM = 2000;
    const SMALLEST_DISTANCE_FARE = 5000;
    const SMALLEST_DISTANCE = 1000;

    let distanceMeters: number;
    let fallbackUsed = false;

    try {
        const response = await axios.post<{
            routes: { distanceMeters: number }[];
        }>(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {
                origin: {
                    location: {
                        latLng: {
                            latitude: origin.lat,
                            longitude: origin.lng,
                        },
                    },
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: destination.lat,
                            longitude: destination.lng,
                        },
                    },
                },
                travelMode: "DRIVE",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": config.GOOGLE_API_KEY,
                    "X-Goog-FieldMask": "routes.distanceMeters",
                },
            }
        );

        if (!response.data.routes?.length) {
            throw new Error("No routes");
        }

        distanceMeters = response.data.routes[0].distanceMeters;
    } catch (error: any) {
        console.error("Google failed, fallback to Haversine");

        fallbackUsed = true;

        distanceMeters = haversineDistanceMeters(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng
        );

        distanceMeters *= 1.4;
    }

    /// ✅ Raw pricing
    let rawFee = 0;

    if (distanceMeters <= SMALLEST_DISTANCE) {
        rawFee = SMALLEST_DISTANCE_FARE;
    } else {
        const distanceKm = Math.ceil(distanceMeters / 1000);
        rawFee = FIRST_KM + (distanceKm - 1) * PER_KM;
    }

    /// ✅ Apply free delivery rule
    let fee = rawFee;
    let isFree = false;

    if (
        freeOverAmount &&
        subtotal &&
        subtotal >= freeOverAmount
    ) {
        fee = 0;
        isFree = true;
    }

    return res.json({
        distanceKm: distanceMeters / 1000,
        rawFee,
        fee,
        isFree,
        fallbackUsed,
    });
}