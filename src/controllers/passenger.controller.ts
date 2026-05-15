import { Request, Response } from "express";
import { PassengerModel } from "../models/PassengerModel";

export const listPassengers = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
        const skip = (page - 1) * pageSize;
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

        const filter: any = {};
        if (q) {
            const num = Number(q);
            if (!isNaN(num)) {
                filter.phone = num;
            }
        }

        const [passengers, total] = await Promise.all([
            PassengerModel.find(filter)
                .select("-events -fcmToken")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            PassengerModel.countDocuments(filter),
        ]);

        return res.json({
            ok: true,
            passengers,
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (err: any) {
        console.error("listPassengers error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

export const updatePassenger = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        if (typeof balance !== "number" || balance < 0) {
            return res.status(400).json({ error: "balance must be a non-negative number" });
        }

        const passenger = await PassengerModel.findByIdAndUpdate(
            id,
            { balance },
            { new: true, select: "-events -fcmToken" }
        ).lean();

        if (!passenger) {
            return res.status(404).json({ error: "Passenger not found" });
        }

        return res.json({ ok: true, passenger });
    } catch (err: any) {
        console.error("updatePassenger error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
