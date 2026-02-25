import jwt from "jsonwebtoken";

export type RestaurantJwtPayload = {
    rid: string; // restaurant id
};

const JWT_SECRET = process.env.JWT_SECRET! as any;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d" as any;

export function signRestaurantToken(payload: RestaurantJwtPayload) {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyRestaurantToken(token: string): RestaurantJwtPayload {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");
    return jwt.verify(token, JWT_SECRET) as RestaurantJwtPayload;
}