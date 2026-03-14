import { Socket } from "socket.io";

export interface RestaurantSocketConnectionPayload {
    socket: Socket;
    restaurantId: string;
}