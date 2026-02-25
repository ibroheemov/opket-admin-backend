import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { UserModel } from "../models/UserModel";
import { RestaurantModel } from "../models/Restaurant";

// type Request = Request & {
//     user?: { id: string; role?: "CONSUMER" | "COURIER" | "RESTAURANT_OWNER" | "ADMIN" };
// };

function bad(res: Response, code: number, message: string) {
    return res.status(code).json({ ok: false, message });
}
function ok(res: Response, data: any) {
    return res.json({ ok: true, ...data });
}

/**
 * POST /admin/restaurant-owners
 * Admin creates a restaurant owner user (and optionally a restaurant stub).
 *
 * body: {
 *   fullName: string,
 *   email: string,
 *   phone?: string,
 *   password: string,
 *   createRestaurant?: boolean,
 *   restaurant?: { name?: string, phone?: string, address?: {...}, location?: {...} } // optional
 * }
 */
export async function createRestaurantOwner(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");
        if (req.user.role !== "ADMIN") return bad(res, 403, "Admin only");

        const {
            fullName,
            email,
            phone,
            password,
            createRestaurant = true,
            restaurant,
        } = req.body ?? {};

        if (!fullName || typeof fullName !== "string") return bad(res, 400, "fullName required");
        if (!email || typeof email !== "string") return bad(res, 400, "email required");
        if (!password || typeof password !== "string" || password.length < 8)
            return bad(res, 400, "password must be at least 8 characters");

        const emailNorm = email.trim().toLowerCase();
        const phoneNorm = typeof phone === "string" ? phone.trim() : null;

        // Pre-check duplicates (still keep unique index in DB!)
        const existing = await UserModel.findOne({
            $or: [{ email: emailNorm }, ...(phoneNorm ? [{ phone: phoneNorm }] : [])],
        }).lean();

        if (existing) return bad(res, 409, "User with same email/phone already exists");

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            const passwordHash = await bcrypt.hash(password, 12);

            const [owner] = await UserModel.create(
                [
                    {
                        fullName: fullName.trim(),
                        email: emailNorm,
                        phone: phoneNorm,
                        role: "RESTAURANT_OWNER",
                        passwordHash,
                        isActive: true,
                    },
                ],
                { session }
            );

            let createdRestaurant: any = null;

            if (createRestaurant) {
                // Create a restaurant stub linked to this owner.
                // Keep required fields safe with defaults.
                const name = restaurant?.name ?? `${owner.fullName}'s Restaurant`;
                const restPhone = restaurant?.phone ?? (phoneNorm ?? "000000000");
                const addr = restaurant?.address ?? {
                    line1: "TBD",
                    city: "TBD",
                    region: "TBD",
                };

                const [rest] = await RestaurantModel.create(
                    [
                        {
                            ownerUserId: owner._id,
                            name,
                            phone: restPhone,
                            // adapt for your Restaurant schema:
                            address: {
                                line1: addr.line1 ?? "TBD",
                                line2: addr.line2 ?? null,
                                city: addr.city ?? "TBD",
                                region: addr.region ?? "TBD",
                                postalCode: addr.postalCode ?? null,
                                country: addr.country ?? null,
                            },
                            // optionally set location
                            location: restaurant?.location ?? null,

                            // sane defaults
                            is_open: false,
                            accepting_orders: false,
                            cuisine_types: [],
                            currency: restaurant?.currency ?? "UZS",
                            commission_percent: restaurant?.commission_percent ?? 0,
                        },
                    ],
                    { session }
                );

                createdRestaurant = rest;
            }

            await session.commitTransaction();

            // IMPORTANT: never return passwordHash
            return ok(res, {
                owner: {
                    id: owner._id,
                    fullName: owner.fullName,
                    email: owner.email,
                    phone: owner.phone,
                    role: owner.role,
                    isActive: owner.isActive,
                    createdAt: owner.createdAt,
                },
                restaurant: createdRestaurant
                    ? { id: createdRestaurant._id, name: createdRestaurant.name, ownerUserId: createdRestaurant.ownerUserId }
                    : null,
            });
        } catch (e: any) {
            await session.abortTransaction();
            // Handle unique index race gracefully
            if (e?.code === 11000) return bad(res, 409, "Email/phone already exists");
            throw e;
        } finally {
            session.endSession();
        }
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}


/**
 * GET /admin/restaurant-owners
 * Query:
 *   page=1
 *   pageSize=10
 *   q=search text (name/email/phone)
 *   onlyActive=true
 */
export async function getRestaurantOwners(req: Request, res: Response) {
    try {
        if (!req.user?.id) return bad(res, 401, "Unauthorized");
        if (req.user.role !== "ADMIN") return bad(res, 403, "Admin only");

        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));
        const skip = (page - 1) * pageSize;

        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const onlyActive = req.query.onlyActive === "true";

        const filter: any = {
            role: "RESTAURANT_OWNER",
        };

        if (onlyActive) {
            filter.isActive = true;
        }

        if (q) {
            filter.$or = [
                { fullName: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { phone: { $regex: q, $options: "i" } },
            ];
        }

        const [items, total] = await Promise.all([
            UserModel.find(filter)
                .select("_id fullName email phone role isActive createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            UserModel.countDocuments(filter),
        ]);

        return ok(res, {
            owners: items,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (err: any) {
        return bad(res, 500, err?.message ?? "Server error");
    }
}