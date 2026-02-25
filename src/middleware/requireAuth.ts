import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt_2";
import { UserModel } from "../models/UserModel";

function unauthorized(res: Response, message = "Unauthorized") {
    return res.status(401).json({ ok: false, message });
}

/**
 * Verifies JWT and attaches req.user
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return unauthorized(res, "Missing token");
        }

        const token = authHeader.split(" ")[1];
        if (!token) return unauthorized(res);

        let payload;
        try {
            payload = verifyToken(token);
        } catch {
            return unauthorized(res, "Invalid or expired token");
        }

        // Optional but recommended:
        // Verify user still exists and is active
        // const user = await UserModel.findById(payload.id)
        //     .select("_id role isActive")
        //     .lean();

        // if (!user || !user.isActive) {
        //     return unauthorized(res, "User no longer active");
        // }

        // Attach safe user object
        req.user = {
            id: payload.id,
            role: payload.role,
        };

        next();
    } catch (err: any) {
        return res.status(500).json({
            ok: false,
            message: err?.message ?? "Server error",
        });
    }
}