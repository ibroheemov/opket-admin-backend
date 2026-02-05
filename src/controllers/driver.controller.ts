// src/controllers/driversController.ts
import { Request, Response } from "express";
import { DriverModel } from "../models/DriverModel";

export const getDrivers = async (req: Request, res: Response) => {
    try {
        const {
            page = "1",
            pageSize = "10",
            status,
            canReceiveOffers,
            q,
            sortBy = "updatedAt",
            sortOrder = "desc",
        } = req.query as Record<string, string>;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};
        if (status) filter.status = status;

        if (typeof canReceiveOffers !== "undefined") {
            if (canReceiveOffers === "true") filter.canReceiveOffers = true;
            if (canReceiveOffers === "false") filter.canReceiveOffers = false;
        }

        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [
                { firstname: regex },
                { lastname: regex },
                { name: regex },
                { phone: regex },
                { carNumber: regex },
                { vehicle: regex },
            ];
        }

        const sort: any = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        const [drivers, total] = await Promise.all([
            DriverModel.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
            DriverModel.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            drivers,
            meta: {
                page: pageNum,
                pageSize: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err: any) {
        console.error("getDrivers error:", err);
        return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
};

export const getDriverById = async (req: Request, res: Response) => {
    try {
        const driver = await DriverModel.findById(req.params.id).lean();
        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
        return res.json({ success: true, driver });
    } catch (err: any) {
        return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
};

const ALLOWED_FIELDS = new Set([
    "firstname",
    "lastname",
    "name",
    "phone",
    "balance",
    "carModel",
    "carNumber",
    "regionCode",
    "carColor",
    "vehicle",
    "status",
    "driver_license",
    "canReceiveOffers",
    "enabledOptions",
    "location",
    "currentRideId",
]);

export const updateDriver = async (req: Request, res: Response) => {
    try {
        const updates: any = {};
        for (const [key, value] of Object.entries(req.body ?? {})) {
            if (ALLOWED_FIELDS.has(key)) updates[key] = value;
        }

        const driver = await DriverModel.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

        return res.json({ success: true, driver });
    } catch (err: any) {
        console.error("updateDriver error:", err);
        return res.status(400).json({ success: false, message: err?.message ?? "Update failed" });
    }
};