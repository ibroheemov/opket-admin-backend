import { Request, Response } from "express";
import { DEFAULT_RIDE_SEARCH_CONFIG, RideSearchConfigModel } from "../models/RideSearchConfigModel";

export const getRideSearchConfig = async (req: Request, res: Response) => {
    try {
        let config = await RideSearchConfigModel.findOne();
        if (!config) {
            config = await RideSearchConfigModel.create(DEFAULT_RIDE_SEARCH_CONFIG);
        }
        res.json({ success: true, config });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateRideSearchConfig = async (req: Request, res: Response) => {
    try {
        const allowed = [
            "searchDurationMs",
            "maxOffersPerDriver",
            "reofferAfterMs",
            "stage1RadiusKm", "stage1TtlMs", "stage1BatchSize",
            "stage2RadiusKm", "stage2TtlMs", "stage2BatchSize",
            "stage3RadiusKm", "stage3TtlMs",
            "stage4RadiusKm", "stage4TtlMs",
        ];

        const update: Record<string, number> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                update[key] = Number(req.body[key]);
            }
        }

        const config = await RideSearchConfigModel.findOneAndUpdate(
            {},
            { $set: update },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, config });
    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }
};
