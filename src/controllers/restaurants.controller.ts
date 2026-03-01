import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { FulfillmentMode, GeoPoint, PaymentMethod, PriceTier, RestaurantModel } from "../models/Restaurant";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";
import cloudinary from "../config/cloudinary";
import bcrypt from "bcrypt";
import { signRestaurantToken } from "../utils/jwt";
import { UserModel } from "../models/UserModel";
import { emptyToNull, parseJsonField, toBool, toNum, uploadToStorage } from "../utils/restaurant.utils";


type AddressInput = {
    line1?: unknown;
    line2?: unknown;
    city?: unknown;
    region?: unknown;
    postalCode?: unknown;
    country?: unknown;
};

type DeliveryInput = {
    radius_km?: unknown;
    fee_base?: unknown;
    fee_per_km?: unknown;
    fee_min?: unknown;
    fee_max?: unknown;
    free_over_amount?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asAddressInput(v: unknown): AddressInput | null {
    return isObject(v) ? (v as AddressInput) : null;
}

function asDeliveryInput(v: unknown): DeliveryInput | null {
    return isObject(v) ? (v as DeliveryInput) : null;
}

function safeNumber(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function validateLatLng(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

type AuthedRequest = Request & {
    user?: { id: string; role?: "CONSUMER" | "COURIER" | "RESTAURANT_OWNER" | "ADMIN" };
};

function isObjectId(id: string) {
    return Types.ObjectId.isValid(id);
}

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ success: false, message });
}

export const loginRestaurant = async (req: Request, res: Response) => {
    // try {
    //     const { phone, password } = req.body ?? {};

    //     if (!phone || !password) {
    //         return res.status(400).json({ success: false, message: "phone and password are required" });
    //     }

    //     // passwordHash is select:false, so we must explicitly select it
    //     const restaurant = await RestaurantModel.findOne({ phone }).select("+passwordHash");
    //     if (!restaurant || !restaurant.passwordHash) {
    //         return res.status(401).json({ success: false, message: "Invalid credentials" });
    //     }

    //     const ok = await bcrypt.compare(password, restaurant.passwordHash);
    //     if (!ok) {
    //         return res.status(401).json({ success: false, message: "Invalid credentials" });
    //     }

    //     const token = signRestaurantToken({ rid: restaurant.id.toString() });

    //     // sanitize: remove passwordHash before returning
    //     const restaurantSafe = restaurant.toObject();
    //     delete (restaurantSafe as any).passwordHash;

    //     return res.status(200).json({
    //         success: true,
    //         token,
    //         restaurant: restaurantSafe,
    //     });
    // } catch (e: any) {
    //     console.error("loginRestaurant:", e);
    //     return res.status(500).json({ success: false, message: e?.message ?? "Login failed" });
    // }
};

// GET /restaurants?page=&pageSize=&q=
export const listRestaurants = async (req: Request, res: Response) => {
    try {
        const { page = "1", pageSize = "10", q, status } = req.query as Record<string, string>;

        const p = Math.max(parseInt(page, 10) || 1, 1);
        const ps = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
        const skip = (p - 1) * ps;

        const filter: any = {};

        // 🔥 Status filtering
        if (!status || status === "ACTIVE") {
            // default
            filter.status = "ACTIVE";
        } else if (status === "ALL") {
            // no filter → all statuses
        } else {
            // support multiple statuses
            const statuses = status.split(",");
            filter.status = { $in: statuses };
        }

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
/**
 * POST /restaurants  (or /admin/restaurants)
 * Content-Type: multipart/form-data
 * fields:
 *   data: JSON string (restaurant payload)
 * files:
 *   logo (optional), banner (optional), gallery[] (optional)
 *
 * Ownership:
 *  - If ADMIN: ownerUserId may be provided in data.ownerUserId
 *  - If RESTAURANT_OWNER: ownerUserId is forced to req.user.id
 */
export const createRestaurant = async (req: AuthedRequest, res: Response) => {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");

        // Parse JSON payload from multipart "data"
        let payload: any = {};
        if (typeof (req.body as any)?.data === "string") {
            try {
                payload = JSON.parse((req.body as any).data);
            } catch {
                return bad(res, 400, "Invalid JSON in 'data'");
            }
        } else {
            // allow JSON requests too (optional)
            payload = req.body ?? {};
        }

        // Determine ownerUserId
        let ownerUserId: string | undefined = payload.ownerUserId;
        let cuisineTypeId: string | undefined = payload.cuisineTypeId;

        console.log("CUSIINE TYTPE ID:", payload.cuisineTypeId);

        if (req.user.role === "RESTAURANT_OWNER") {
            ownerUserId = req.user.id; // secure override
        } else if (req.user.role === "ADMIN") {
            if (!ownerUserId || !isObjectId(ownerUserId)) {
                return bad(res, 400, "ownerUserId is required for admin restaurant creation");
            }
            // validate owner exists and is the right role
            const owner = await UserModel.findById(ownerUserId).select("_id role isActive").lean();
            if (!owner || !owner.isActive) return bad(res, 400, "Owner user not found or inactive");
            if (owner.role !== "RESTAURANT_OWNER") return bad(res, 400, "ownerUserId must be a RESTAURANT_OWNER");
        } else {
            return bad(res, 403, "Forbidden");
        }

        // Validate required fields (scaled model)
        const name = String(payload.name ?? "").trim();
        const phone = String(payload.phone ?? "").trim();

        let address = payload.address ?? {};

        if (typeof address === "string") {
            try {
                address = JSON.parse(address);
            } catch {
                return bad(res, 400, "Invalid JSON in 'address'");
            }
        }

        const line1 = String(address.line1 ?? "").trim();
        const city = String(address.city ?? "").trim();
        const region = String(address.region ?? "").trim();

        if (!name) return bad(res, 400, "name is required");
        if (!phone) return bad(res, 400, "phone is required");
        if (!line1) return bad(res, 400, "address.line1 is required");
        if (!city) return bad(res, 400, "address.city is required");
        if (!region) return bad(res, 400, "address.region is required");

        // Optional geo: accept either payload.location or payload.lat/lng
        let location: any = null;

        // If location is already in GeoJSON format
        if (payload.location?.type === "Point" && Array.isArray(payload.location.coordinates)) {
            const [lng, lat] = payload.location.coordinates.map(Number);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || !validateLatLng(lat, lng)) {
                return bad(res, 400, "Invalid location.coordinates");
            }
            location = { type: "Point", coordinates: [lng, lat] };
        } else {
            const lat = safeNumber(payload.lat);
            const lng = safeNumber(payload.lng);
            if (lat !== null && lng !== null) {
                if (!validateLatLng(lat, lng)) return bad(res, 400, "Invalid lat/lng range");
                location = { type: "Point", coordinates: [lng, lat] };
            }
        }

        // Files: logo/banner/gallery
        const files = (req as any).files as
            | {
                logo?: Express.Multer.File[];
                banner?: Express.Multer.File[];
                gallery?: Express.Multer.File[];
            }
            | undefined;

        let logo_url: string | null = null;
        let logo_public_id: string | null = null;

        let banner_url: string | null = null;
        let banner_public_id: string | null = null;

        const gallery_urls: string[] = [];

        const logoFile = files?.logo?.[0];
        if (logoFile) {
            const uploaded = await uploadBufferToCloudinary(logoFile.buffer, { folder: "restaurants/logos" });
            logo_url = uploaded.secure_url;
            logo_public_id = uploaded.public_id;
        }

        const bannerFile = files?.banner?.[0];
        if (bannerFile) {
            const uploaded = await uploadBufferToCloudinary(bannerFile.buffer, { folder: "restaurants/banners" });
            banner_url = uploaded.secure_url;
            banner_public_id = uploaded.public_id;
        }

        const galleryFiles = files?.gallery ?? [];
        for (const gf of galleryFiles) {
            const uploaded = await uploadBufferToCloudinary(gf.buffer, { folder: "restaurants/gallery" });
            gallery_urls.push(uploaded.secure_url);
        }

        // Normalize arrays/enums
        const cuisine_types: string[] = Array.isArray(payload.cuisine_types) ? payload.cuisine_types.map(String) : [];
        const tags: string[] = Array.isArray(payload.tags) ? payload.tags.map(String) : [];

        const fulfillment_modes: string[] = Array.isArray(payload.fulfillment_modes) ? payload.fulfillment_modes : ["DELIVERY"];
        const payment_methods: string[] = Array.isArray(payload.payment_methods) ? payload.payment_methods : ["CASH"];

        // Delivery settings (object)
        const delivery = payload.delivery ?? {};
        const radius_km = safeNumber(delivery.radius_km) ?? 8;
        const fee_base = safeNumber(delivery.fee_base) ?? 0;

        if (radius_km < 0) return bad(res, 400, "delivery.radius_km must be >= 0");
        if (fee_base < 0) return bad(res, 400, "delivery.fee_base must be >= 0");

        const restaurant = await RestaurantModel.create({
            ownerUserId: new Types.ObjectId(ownerUserId),

            status: payload.status ?? "ACTIVE",

            name,
            description: payload.description ?? null,
            phone,

            address: {
                line1,
                line2: address.line2 ?? null,
                city,
                region,
                postalCode: address.postalCode ?? null,
                country: address.country ?? null,
            },

            location,

            logo_url,
            logo_public_id,
            banner_url,
            banner_public_id,
            gallery_urls,

            cuisine_types,
            cuisineTypeId,
            tags,
            price_tier: payload.price_tier ?? null,

            is_open: typeof payload.is_open === "boolean" ? payload.is_open : true,
            accepting_orders: typeof payload.accepting_orders === "boolean" ? payload.accepting_orders : true,
            temporarily_closed_reason: payload.temporarily_closed_reason ?? null,

            timezone: payload.timezone ?? null,
            hours_json: payload.hours_json ?? null,

            fulfillment_modes,
            payment_methods,
            supports_scheduled_orders: !!payload.supports_scheduled_orders,
            auto_accept_orders: !!payload.auto_accept_orders,

            prep_time_min: safeNumber(payload.prep_time_min) ?? 15,
            prep_time_max: safeNumber(payload.prep_time_max) ?? 45,

            min_order_amount: safeNumber(payload.min_order_amount) ?? 0,

            delivery: {
                radius_km,
                fee_base,
                fee_per_km: safeNumber(delivery.fee_per_km),
                fee_min: safeNumber(delivery.fee_min),
                fee_max: safeNumber(delivery.fee_max),
                free_over_amount: safeNumber(delivery.free_over_amount),
            },

            currency: String(payload.currency ?? "UZS"),
            commission_percent: safeNumber(payload.commission_percent) ?? 0,

            // metrics defaults are handled in schema
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
        const id = req.params.id;
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;

        const existing = await RestaurantModel.findById(id);
        if (!existing) return res.status(404).json({ ok: false, message: "Restaurant not found" });

        // Parse JSON fields (may be missing in PATCH)
        const addressRaw: unknown =
            req.body.address !== undefined ? parseJsonField<unknown>(req.body.address, null) : undefined;

        const deliveryRaw: unknown =
            req.body.delivery !== undefined ? parseJsonField<unknown>(req.body.delivery, null) : undefined;
        const location = req.body.location !== undefined ? parseJsonField<GeoPoint | null>(req.body.location, null) : undefined;

        const cuisine_types = req.body.cuisine_types !== undefined ? parseJsonField<string[]>(req.body.cuisine_types, []) : undefined;
        const tags = req.body.tags !== undefined ? parseJsonField<string[]>(req.body.tags, []) : undefined;
        const fulfillment_modes =
            req.body.fulfillment_modes !== undefined ? parseJsonField<FulfillmentMode[]>(req.body.fulfillment_modes, []) : undefined;
        const payment_methods =
            req.body.payment_methods !== undefined ? parseJsonField<PaymentMethod[]>(req.body.payment_methods, []) : undefined;

        // Upload files if any new ones provided
        const logoFile = files?.logo?.[0];
        const bannerFile = files?.banner?.[0];
        const galleryFiles = files?.gallery ?? [];

        const $set: any = {};
        const $unset: any = {};

        // top-level fields (only set if provided)
        if (req.body.ownerUserId !== undefined) $set.ownerUserId = String(req.body.ownerUserId || "");
        if (req.body.cuisineTypeId !== undefined) $set.cuisineTypeId = String(req.body.cuisineTypeId || "");
        if (req.body.status !== undefined) $set.status = req.body.status;

        if (req.body.name !== undefined) $set.name = String(req.body.name).trim();
        if (req.body.description !== undefined) $set.description = emptyToNull(req.body.description);
        if (req.body.phone !== undefined) $set.phone = String(req.body.phone).trim();

        if (req.body.is_open !== undefined) $set.is_open = toBool(req.body.is_open, existing.is_open);
        if (req.body.accepting_orders !== undefined) $set.accepting_orders = toBool(req.body.accepting_orders, existing.accepting_orders);
        if (req.body.temporarily_closed_reason !== undefined)
            $set.temporarily_closed_reason = emptyToNull(req.body.temporarily_closed_reason);

        if (req.body.timezone !== undefined) $set.timezone = emptyToNull(req.body.timezone);

        if (req.body.supports_scheduled_orders !== undefined)
            $set.supports_scheduled_orders = toBool(req.body.supports_scheduled_orders, existing.supports_scheduled_orders);
        if (req.body.auto_accept_orders !== undefined)
            $set.auto_accept_orders = toBool(req.body.auto_accept_orders, existing.auto_accept_orders);

        if (req.body.prep_time_min !== undefined) $set.prep_time_min = toNum(req.body.prep_time_min, existing.prep_time_min);
        if (req.body.prep_time_max !== undefined) $set.prep_time_max = toNum(req.body.prep_time_max, existing.prep_time_max);

        if (req.body.rating_avg !== undefined) $set.rating_avg = toNum(req.body.rating_avg, existing.rating_avg);

        if (req.body.min_order_amount !== undefined) $set.min_order_amount = toNum(req.body.min_order_amount, existing.min_order_amount);

        if (req.body.currency !== undefined) $set.currency = String(req.body.currency);
        if (req.body.commission_percent !== undefined)
            $set.commission_percent = toNum(req.body.commission_percent, existing.commission_percent);

        if (req.body.price_tier !== undefined) {
            const pt = req.body.price_tier === "" || req.body.price_tier == null ? null : (Number(req.body.price_tier) as PriceTier);
            $set.price_tier = pt;
        }

        // nested objects
        if (addressRaw !== undefined) {
            const address = asAddressInput(addressRaw);
            if (!address) return res.status(400).json({ ok: false, message: "address must be JSON object" });

            $set.address = {
                line1: String(address.line1 ?? ""),
                line2: emptyToNull(address.line2),
                city: String(address.city ?? ""),
                region: String(address.region ?? ""),
                postalCode: emptyToNull(address.postalCode),
                country: emptyToNull(address.country),
            };
        }

        if (deliveryRaw !== undefined) {
            const delivery = asDeliveryInput(deliveryRaw);
            if (!delivery) return res.status(400).json({ ok: false, message: "delivery must be JSON object" });

            $set.delivery = {
                radius_km: toNum(delivery.radius_km, existing.delivery.radius_km),
                fee_base: toNum(delivery.fee_base, existing.delivery.fee_base),
                fee_per_km: delivery.fee_per_km == null ? null : toNum(delivery.fee_per_km, 0),
                fee_min: delivery.fee_min == null ? null : toNum(delivery.fee_min, 0),
                fee_max: delivery.fee_max == null ? null : toNum(delivery.fee_max, 0),
                free_over_amount: delivery.free_over_amount == null ? null : toNum(delivery.free_over_amount, 0),
            };
        }

        if (location !== undefined) {
            // set null to clear
            $set.location = location;
        }

        // arrays
        if (cuisine_types !== undefined) $set.cuisine_types = cuisine_types;
        if (tags !== undefined) $set.tags = tags;
        if (fulfillment_modes !== undefined) $set.fulfillment_modes = fulfillment_modes;
        if (payment_methods !== undefined) $set.payment_methods = payment_methods;

        // media
        if (logoFile) $set.logo_url = (await uploadBufferToCloudinary(logoFile.buffer, { folder: "restaurants" })).secure_url;
        if (bannerFile) $set.banner_url = (await uploadBufferToCloudinary(bannerFile.buffer, { folder: "restaurants" })).secure_url;

        // Choose behavior for gallery:
        // (A) replace gallery if new files uploaded:
        if (galleryFiles.length > 0) {
            const newUrls = await Promise.all(galleryFiles.map((f) => uploadToStorage(f, "restaurants/gallery")));
            $set.gallery_urls = newUrls;
        }

        // If you want "append instead of replace", use:
        // if (galleryFiles.length > 0) {
        //   const newUrls = await Promise.all(galleryFiles.map((f) => uploadToStorage(f, "restaurants/gallery")));
        //   $set.gallery_urls = [...(existing.gallery_urls ?? []), ...newUrls];
        // }

        // If you want to clear logo/banner/gallery explicitly, support flags:
        if (toBool(req.body.clear_logo, false)) $set.logo_url = null;
        if (toBool(req.body.clear_banner, false)) $set.banner_url = null;
        if (toBool(req.body.clear_gallery, false)) $set.gallery_urls = [];

        const updated = await RestaurantModel.findByIdAndUpdate(
            id,
            Object.keys($unset).length ? { $set, $unset } : { $set },
            { new: true }
        );

        return res.json({ ok: true, restaurant: updated });
    } catch (e: any) {
        return res.status(500).json({ ok: false, message: e?.message ?? "Server error" });
    }
};