// src/controllers/driversController.ts
import { Request, Response } from "express";
import axios from "axios";
import { config } from "../config/env";
import { DriverModel } from "../models/DriverModel";
import { driverStoreRedis } from "../services/driver_redis.service";

export const getDrivers = async (req: Request, res: Response) => {
    try {
        const {
            page = "1",
            pageSize = "10",
            status,
            canReceiveOffers,
            documentsApproved,
            documentsRejected,
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

        if (typeof documentsApproved !== "undefined") {
            if (documentsApproved === "true") filter.documentsApproved = true;
            if (documentsApproved === "false") filter.documentsApproved = { $ne: true };
        }

        if (typeof documentsRejected !== "undefined") {
            if (documentsRejected === "true") filter.documentsRejected = true;
            if (documentsRejected === "false") filter.documentsRejected = { $ne: true };
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
    "tariffs",
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

export const getOnlineDrivers = async (
    req: Request,
    res: Response
) => {
    try {
        const { lat, lon, radiusKm } = req.query;

        if (!lat || !lon || !radiusKm) {
            return res.status(400).json({
                message: "lat, lon and radiusKm are required",
            });
        }

        const latitude = Number(lat);
        const longitude = Number(lon);
        const radius = Number(radiusKm);

        if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
            return res.status(400).json({
                message: "Invalid numeric values",
            });
        }

        const drivers = await driverStoreRedis.getDriversInRadius(
            latitude,
            longitude,
            radius
        );

        return res.json({
            count: drivers.length,
            drivers,
        });

    } catch (error) {
        console.error("Radius search error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const approveDriverDocuments = async (req: Request, res: Response) => {
    try {
        const driver = await DriverModel.findByIdAndUpdate(
            req.params.id,
            { documentsApproved: true, canReceiveOffers: true },
            { new: true }
        ).lean();

        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

        // Proxy to main backend for FCM notification
        try {
            await axios.post(`${config.backendUrl}/driver/${req.params.id}/approve-documents`);
        } catch (fcmErr) {
            console.error("FCM notification proxy error:", fcmErr);
        }

        return res.json({ success: true, driver });
    } catch (err: any) {
        console.error("approveDriverDocuments error:", err);
        return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
};

export const rejectDriverDocuments = async (req: Request, res: Response) => {
    try {
        const { comment } = req.body as { comment?: string };

        const driver = await DriverModel.findByIdAndUpdate(
            req.params.id,
            {
                documentsApproved: false,
                documentsRejected: true,
                canReceiveOffers: false,
                rejectionComment: comment ?? "",
            },
            { new: true }
        ).lean();

        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

        try {
            await axios.post(`${config.backendUrl}/driver/${req.params.id}/reject-documents`, { comment: comment ?? "" });
        } catch (fcmErr) {
            console.error("FCM rejection proxy error:", fcmErr);
        }

        return res.json({ success: true, driver });
    } catch (err: any) {
        console.error("rejectDriverDocuments error:", err);
        return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
};

export const resetDocumentStatus = async (req: Request, res: Response) => {
    try {
        const driver = await DriverModel.findByIdAndUpdate(
            req.params.id,
            {
                documentsApproved: false,
                documentsRejected: false,
                rejectionComment: "",
                canReceiveOffers: false,
            },
            { new: true }
        ).lean();

        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

        try {
            await axios.post(`${config.backendUrl}/driver/${req.params.id}/reset-document-status`);
        } catch (fcmErr) {
            console.error("FCM reset proxy error:", fcmErr);
        }

        return res.json({ success: true, driver });
    } catch (err: any) {
        console.error("resetDocumentStatus error:", err);
        return res.status(500).json({ success: false, message: err?.message ?? "Server error" });
    }
};

export const getAllOnlineDrivers = async (
    req: Request,
    res: Response
) => {
    try {
        const drivers = await driverStoreRedis.getAllGeoDrivers();

        return res.json({
            count: drivers.length,
            drivers,
        });

    } catch (error) {
        console.error("Radius search error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};