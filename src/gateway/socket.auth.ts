import jwt from "jsonwebtoken";
import { Socket } from "socket.io";
import { SocketAuthPayload } from "../types/socket.types";
import { config } from "../config/env";

export const authenticateSocket = (socket: Socket): {
    restaurantId?: string;
    isBackground?: boolean;
} | null => {
    const { token, isBackground } = socket.handshake.auth || {};

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as SocketAuthPayload;
        const role = decoded.role;
        const id = decoded.id;

        console.log("ROLE: ", decoded.role, "ID:", decoded.id);

        if (role == "RESTAURANT_OWNER") {
            return { restaurantId: id, isBackground };
        }

    } catch (error) {
        console.warn("❌ Invalid token");
        return null;
    }

    return null;
};
