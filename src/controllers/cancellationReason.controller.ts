import { Request, Response } from "express";
import mongoose from "mongoose";
import { CancellationReasonModel } from "../models/CancellationReasonModel";

/**
 * GET /admin/cancel-reasons
 * Returns all reasons (active + inactive) with their counts, ordered by `order`.
 */
export const listCancelReasons = async (_req: Request, res: Response) => {
    try {
        const reasons = await CancellationReasonModel.find()
            .sort({ order: 1, createdAt: 1 })
            .lean();
        return res.json({ reasons });
    } catch (err) {
        console.error("listCancelReasons error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * POST /admin/cancel-reasons
 * body: { key, labelUz, order?, active? }
 */
export const createCancelReason = async (req: Request, res: Response) => {
    try {
        const { key, labelUz, order, active } = req.body ?? {};
        if (typeof key !== "string" || key.length === 0)
            return res.status(400).json({ error: "`key` is required" });
        if (typeof labelUz !== "string" || labelUz.length === 0)
            return res.status(400).json({ error: "`labelUz` is required" });

        const reason = await CancellationReasonModel.create({
            key,
            labelUz,
            order: typeof order === "number" ? order : 0,
            active: typeof active === "boolean" ? active : true,
            count: 0,
        });
        return res.status(201).json(reason);
    } catch (err: any) {
        if (err?.code === 11000)
            return res.status(409).json({ error: "Reason with this key already exists" });
        console.error("createCancelReason error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * PATCH /admin/cancel-reasons/:id
 * Only `labelUz`, `order`, `active` are updatable. Counts are managed by the
 * main backend; admins reset counts via the dedicated endpoint below.
 */
export const updateCancelReason = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id))
            return res.status(400).json({ error: "invalid id" });

        const patch: Record<string, unknown> = {};
        const { labelUz, order, active } = req.body ?? {};
        if (labelUz !== undefined) {
            if (typeof labelUz !== "string" || labelUz.length === 0)
                return res.status(400).json({ error: "`labelUz` must be a non-empty string" });
            patch.labelUz = labelUz;
        }
        if (order !== undefined) {
            if (typeof order !== "number")
                return res.status(400).json({ error: "`order` must be a number" });
            patch.order = order;
        }
        if (active !== undefined) {
            if (typeof active !== "boolean")
                return res.status(400).json({ error: "`active` must be boolean" });
            patch.active = active;
        }

        const updated = await CancellationReasonModel.findByIdAndUpdate(id, patch, {
            new: true,
        });
        if (!updated) return res.status(404).json({ error: "not found" });
        return res.json(updated);
    } catch (err) {
        console.error("updateCancelReason error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

export const deleteCancelReason = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id))
            return res.status(400).json({ error: "invalid id" });
        const deleted = await CancellationReasonModel.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: "not found" });
        return res.json({ success: true });
    } catch (err) {
        console.error("deleteCancelReason error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * POST /admin/cancel-reasons/:id/reset-count
 * Resets the count of a single reason back to 0. Useful at the start of a
 * reporting period without losing historical reason rows.
 */
export const resetCancelReasonCount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id))
            return res.status(400).json({ error: "invalid id" });
        const updated = await CancellationReasonModel.findByIdAndUpdate(
            id,
            { count: 0 },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: "not found" });
        return res.json(updated);
    } catch (err) {
        console.error("resetCancelReasonCount error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
