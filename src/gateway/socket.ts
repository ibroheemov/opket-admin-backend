import { Server } from "socket.io";
import http from "http";
import { authenticateSocket } from "./socket.auth";
import { registerRestaurantBGHandler } from "./restaurant.socket.bg";
import { registerRestaurantHandlers } from "./restaurant.socket";

export const restaurantSockets = new Map<string, string>(); // driverId -> socketId

export let socketIo: Server;

export const initSocketServer = (server: http.Server) => {
    // Initialize Socket.IO with path /socket.io
    socketIo = new Server(server, {
        cors: { origin: "*" },
        path: "/socket.io",
    });

    socketIo.on("connection", (socket) => {
        const auth = authenticateSocket(socket);

        if (!auth) {
            console.warn("❌ Unauthorized connection, disconnecting");
            socket.disconnect(true);
            return;
        }

        if (auth.restaurantId && auth.isBackground) {
            registerRestaurantBGHandler({ socket, restaurantId: auth.restaurantId })
        } else if (auth.restaurantId) {
            registerRestaurantHandlers({ socket, restaurantId: auth.restaurantId })
        }
    });
    return socketIo;
};

export const emitToRestaurant = async (restaurantId: string, event: string, data: any) => {
    const socketId = restaurantSockets.get(restaurantId);

    if (socketId) {
        socketIo.to(socketId).emit(event, data);
        return true;
    }
    return false;
};