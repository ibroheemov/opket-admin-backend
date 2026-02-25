import { Request, Response, NextFunction } from "express";

export function requireRole(
    ...allowedRoles: Array<"CONSUMER" | "COURIER" | "RESTAURANT_OWNER" | "ADMIN">
) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ ok: false, message: "Unauthorized" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ ok: false, message: "Forbidden" });
        }

        next();
    };
}