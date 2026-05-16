import { AuthRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import { RideModel } from "../models/Ride";

export const getRides = async (req: AuthRequest, res: Response) => {
    try {
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
            sortOrder = "desc",
            from,
            to,
            q,
            driverQ,
        } = req.query as Record<string, string>;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        // -------------------------
        // 🎯 Filters
        // -------------------------
        const rideMatch: any = {};
        const ghostMatch: any = {};

        if (status) rideMatch.status = status;
        if (type) rideMatch.type = type;

        if (rideType) {
            rideMatch.rideType = rideType;
            ghostMatch.rideType = rideType;
        }

        if (typeof luggage !== "undefined") {
            if (luggage === "true") rideMatch.luggage = true;
            if (luggage === "false") rideMatch.luggage = false;
        }

        if (userChatId) rideMatch.userChatId = Number(userChatId);
        if (userId) rideMatch.userId = userId;

        if (driverId) {
            rideMatch.driverId = driverId;
            ghostMatch.driverId = driverId;
        }

        if (offeredTo) rideMatch.offeredTo = offeredTo;

        if (from || to) {
            const df: any = {};
            if (from) df.$gte = new Date(from);
            if (to) df.$lte = new Date(to);

            rideMatch.createdAt = df;
            ghostMatch.createdAt = df;
        }

        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            rideMatch.$or = [
                { "pickup.address": regex },
                { "dropoff.address": regex },
            ];
        }

        const sortStage = {
            $sort: {
                [sortBy]: sortOrder === "asc" ? 1 : -1,
            },
        };

        // -------------------------
        // 🚀 Aggregation
        // -------------------------

        const pipeline: any[] = [
            { $match: rideMatch },

            { $addFields: { source: "ride" } },

            {
                $unionWith: {
                    coll: "ghostrides",
                    pipeline: [
                        { $match: ghostMatch },
                        {
                            $addFields: {
                                type: "ghost",
                                source: "ghost",
                            },
                        },
                    ],
                },
            },

            // -------------------------
            // 👤 DRIVER LOOKUP
            // -------------------------
            {
                $lookup: {
                    from: "drivers",
                    localField: "driverId",
                    foreignField: "_id",
                    as: "driver",
                },
            },
            {
                $unwind: {
                    path: "$driver",
                    preserveNullAndEmptyArrays: true,
                },
            },

            ...(driverQ && driverQ.trim()
                ? [
                      {
                          $match: {
                              $or: [
                                  { "driver.carNumber": new RegExp(driverQ.trim(), "i") },
                                  { "driver.name": new RegExp(driverQ.trim(), "i") },
                                  { "driver.phone": new RegExp(driverQ.trim(), "i") },
                                  { "driver.carModel": new RegExp(driverQ.trim(), "i") },
                                  { "driver.carColor": new RegExp(driverQ.trim(), "i") },
                              ],
                          },
                      },
                  ]
                : []),

            // -------------------------
            // 📜 STATUS HISTORY DRIVER LOOKUP
            // -------------------------

            // collect all driverIds from statusHistory
            {
                $addFields: {
                    statusDriverIds: {
                        $map: {
                            input: "$statusHistory",
                            as: "s",
                            in: "$$s.driverId",
                        },
                    },
                },
            },

            {
                $lookup: {
                    from: "drivers",
                    localField: "statusDriverIds",
                    foreignField: "_id",
                    as: "statusDrivers",
                },
            },

            // merge driver info into each statusHistory item
            {
                $addFields: {
                    statusHistory: {
                        $map: {
                            input: "$statusHistory",
                            as: "s",
                            in: {
                                $mergeObjects: [
                                    "$$s",
                                    {
                                        driver: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$statusDrivers",
                                                        as: "d",
                                                        cond: {
                                                            $eq: ["$$d._id", "$$s.driverId"],
                                                        },
                                                    },
                                                },
                                                0,
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },

            // optional cleanup
            {
                $project: {
                    statusDriverIds: 0,
                    statusDrivers: 0,
                },
            },

            sortStage,

            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limitNum },
                    ],
                    meta: [{ $count: "total" }],
                },
            },
        ];

        const result = await RideModel.aggregate(pipeline);

        const rides = result[0]?.data || [];
        const total = result[0]?.meta?.[0]?.total || 0;

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