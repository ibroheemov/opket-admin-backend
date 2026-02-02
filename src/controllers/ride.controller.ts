import { AuthRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import { RideModel } from "../models/Ride";

export const getRides = async (req: AuthRequest, res: Response) => {
    try {
        // Query params
        const {
            page = "1",
            pageSize = "10",
            status,
            type,
            rideType,
            luggage,
            userChatId,
            userId,
            driverId,
            offeredTo,
            sortBy = "createdAt",
            sortOrder = "desc", // "asc" | "desc"
            from, // date string
            to,   // date string
            q,    // optional text search for addresses
        } = req.query as Record<string, string>;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        // Build filter
        const filter: any = {};

        if (status) filter.status = status;
        if (type) filter.type = type;
        if (rideType) filter.rideType = rideType;

        if (typeof luggage !== "undefined") {
            // luggage can be "true"/"false"
            if (luggage === "true") filter.luggage = true;
            if (luggage === "false") filter.luggage = false;
        }

        if (userChatId) filter.userChatId = Number(userChatId);
        if (userId) filter.userId = userId;
        if (driverId) filter.driverId = driverId;
        if (offeredTo) filter.offeredTo = offeredTo;

        // Date range filter (createdAt)
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        // Optional search (pickup/dropoff address)
        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [
                { "pickup.address": regex },
                { "dropoff.address": regex },
            ];
        }

        // Sorting
        const sort: any = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        const [rides, total] = await Promise.all([
            RideModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            RideModel.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            rides,
            meta: {
                page: pageNum,
                pageSize: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err: any) {
        console.error("getRides error:", err);
        return res.status(500).json({
            success: false,
            message: err?.message ?? "Server error",
        });
    }
};
