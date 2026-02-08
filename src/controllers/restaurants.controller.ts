import { Request, Response } from "express";
import mongoose from "mongoose";
import { RestaurantModel } from "../models/Restaurant";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";
import cloudinary from "../config/cloudinary";

// GET /restaurants?page=&pageSize=&q=
export const listRestaurants = async (req: Request, res: Response) => {
    try {
        const { page = "1", pageSize = "10", q } = req.query as Record<string, string>;

        const p = Math.max(parseInt(page, 10) || 1, 1);
        const ps = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
        const skip = (p - 1) * ps;

        const filter: any = {};
        if (q && q.trim()) {
            const s = q.trim();
            // If you added a text index, you can use $text. Otherwise regex works fine.
            // filter.$text = { $search: s };
            const regex = new RegExp(s, "i");
            filter.$or = [
                { name: regex },
                { phone: regex },
                { city: regex },
                { region: regex },
                { address_line1: regex },
                { address_line2: regex },
            ];
        }

        const [restaurants, total] = await Promise.all([
            RestaurantModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(ps).lean(),
            RestaurantModel.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            restaurants,
            meta: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
        });
    } catch (e: any) {
        console.error("listRestaurants:", e);
        return res.status(500).json({ success: false, message: e?.message ?? "Server error" });
    }
};

// POST /restaurants
export const createRestaurant = async (req: Request, res: Response) => {
    try {
        const payload = req.body ?? {};
        console.log(payload);

        // Basic required fields check (Mongoose will validate too)
        const required = ["name", "phone", "address_line1", "city", "region"];
        for (const k of required) {
            if (!payload[k]) {
                return res.status(400).json({ success: false, message: `${k} is required` });
            }
        }

        // Optional: validate ownerUserId if present
        if (payload.ownerUserId && !mongoose.isValidObjectId(payload.ownerUserId)) {
            return res.status(400).json({ success: false, message: "Invalid ownerUserId" });
        }

        // 1) upload banner if provided
        let banner_url: string | null = null;
        let banner_public_id: string | null = null;

        const file = (req as any).file as Express.Multer.File | undefined;

        if (file) {
            const uploaded = await uploadBufferToCloudinary(file.buffer, {
                folder: "restaurants/banners",
            });

            banner_url = uploaded.secure_url;
            banner_public_id = uploaded.public_id;
        }

        const restaurant = await RestaurantModel.create({
            ownerUserId: payload.ownerUserId ?? undefined,
            name: payload.name,
            phone: payload.phone,
            address_line1: payload.address_line1,
            address_line2: payload.address_line2,
            city: payload.city,
            region: payload.region,
            postal_code: payload.postal_code,
            lat: payload.lat ?? null,
            lng: payload.lng ?? null,
            is_open: typeof payload.is_open === "boolean" ? payload.is_open : true,
            hours_json: payload.hours_json,
            min_order_amount: payload.min_order_amount ?? null,
            delivery_fee_base: payload.delivery_fee_base ?? null,
            banner_url: banner_url ?? null,
            banner_public_id: banner_public_id ?? null,
        });

        return res.status(201).json({ success: true, restaurant });
    } catch (e: any) {
        console.error("createRestaurant:", e);
        return res.status(400).json({ success: false, message: e?.message ?? "Create failed" });
    }
};

// GET /restaurants/:id
export const getRestaurantById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid restaurant id" });
        }

        const restaurant = await RestaurantModel.findById(id).lean();
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        return res.json({ success: true, restaurant });
    } catch (e: any) {
        console.error("getRestaurantById:", e);
        return res.status(500).json({ success: false, message: e?.message ?? "Server error" });
    }
};

// PATCH /restaurants/:id
export const updateRestaurant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid restaurant id" });
        }

        // Fetch current doc so we can delete old banner if replacing
        const current = await RestaurantModel.findById(id).lean();
        if (!current) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        // Whitelist allowed fields (+ banner fields)
        const ALLOWED = new Set([
            "ownerUserId",
            "name",
            "phone",
            "address_line1",
            "address_line2",
            "city",
            "region",
            "postal_code",
            "lat",
            "lng",
            "is_open",
            "hours_json",
            "min_order_amount",
            "delivery_fee_base",

            // ✅ add these to your schema too
            "banner_url",
            "banner_public_id",
        ]);

        // helpers for multipart/form-data where everything arrives as string
        const toNumberOrNull = (v: any) => {
            if (v === "" || v == null) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const toBool = (v: any) => {
            if (typeof v === "boolean") return v;
            if (v === "true") return true;
            if (v === "false") return false;
            return !!v;
        };

        const updates: any = {};
        for (const [k, v] of Object.entries(req.body ?? {})) {
            if (!ALLOWED.has(k)) continue;

            // normalize types for known numeric/bool fields
            if (k === "is_open") updates[k] = toBool(v);
            else if (k === "min_order_amount" || k === "delivery_fee_base") updates[k] = toNumberOrNull(v);
            else if (k === "lat" || k === "lng") updates[k] = toNumberOrNull(v);
            else updates[k] = v;
        }

        // Validate ownerUserId if updating it
        if (updates.ownerUserId && !mongoose.isValidObjectId(updates.ownerUserId)) {
            return res.status(400).json({ success: false, message: "Invalid ownerUserId" });
        }

        // ✅ handle banner upload (optional)
        const file = (req as any).file as Express.Multer.File | undefined;
        if (file) {
            // delete old banner asset if exists
            if ((current as any).banner_public_id) {
                await cloudinary.uploader.destroy((current as any).banner_public_id).catch(() => { });
            }

            const uploaded = await uploadBufferToCloudinary(file.buffer, {
                folder: "restaurants/banners",
            });

            updates.banner_url = uploaded.secure_url;
            updates.banner_public_id = uploaded.public_id;
        }

        const restaurant = await RestaurantModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();

        return res.json({ success: true, restaurant });
    } catch (e: any) {
        console.error("updateRestaurant:", e);
        return res.status(400).json({ success: false, message: e?.message ?? "Update failed" });
    }
};