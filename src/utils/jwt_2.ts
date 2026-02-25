import jwt from "jsonwebtoken";
import { config } from "../config/env";

export interface JwtPayload {
    id: string;
    role: "CONSUMER" | "COURIER" | "RESTAURANT_OWNER" | "ADMIN";
}

const JWT_SECRET = config.jwtSecret;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not defined in environment");
}

export function signToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "7d",
    });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}