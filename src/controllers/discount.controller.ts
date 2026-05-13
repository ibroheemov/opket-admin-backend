import { Request, Response } from "express";
import {
    DiscountConfigModel,
    IDiscountTier,
    getDiscountConfigDoc,
} from "../models/DiscountConfigModel";

function isValidTier(t: any): t is IDiscountTier {
    if (!t || typeof t !== "object") return false;
    if (typeof t.minFare !== "number" || t.minFare < 0) return false;
    if (t.maxFare !== null && (typeof t.maxFare !== "number" || t.maxFare <= t.minFare)) return false;
    if (t.type !== "percentage" && t.type !== "fixed") return false;
    if (typeof t.value !== "number" || t.value < 0) return false;
    if (t.type === "percentage" && t.value > 100) return false;
    return true;
}

export const getDiscountConfig = async (_req: Request, res: Response) => {
    try {
        const doc = await getDiscountConfigDoc();
        return res.json({
            enabled: doc.enabled,
            tiers: doc.tiers ?? [],
        });
    } catch (err: any) {
        console.error("getDiscountConfig error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

export const updateDiscountConfig = async (req: Request, res: Response) => {
    try {
        const { enabled, tiers } = req.body ?? {};

        if (typeof enabled !== "boolean") {
            return res.status(400).json({ error: "`enabled` must be boolean" });
        }
        if (!Array.isArray(tiers)) {
            return res.status(400).json({ error: "`tiers` must be an array" });
        }
        for (const tier of tiers) {
            if (!isValidTier(tier)) {
                return res.status(400).json({ error: "Invalid tier in payload", tier });
            }
        }

        // Sort tiers by minFare so the apps can evaluate them in order.
        const sorted = [...tiers].sort((a, b) => a.minFare - b.minFare);

        const doc = await DiscountConfigModel.findOneAndUpdate(
            {},
            { enabled, tiers: sorted },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            enabled: doc.enabled,
            tiers: doc.tiers ?? [],
        });
    } catch (err: any) {
        console.error("updateDiscountConfig error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
