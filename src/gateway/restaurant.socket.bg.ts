import { Socket } from "socket.io";
import { restaurantSockets } from "./socket";

export const registerRestaurantBGHandler = async ({ socket, restaurantId }: {
    socket: Socket;
    restaurantId: string;
}) => {
    restaurantSockets.set(`${restaurantId}-bg`, socket.id);
    console.log("Restaurant connected BG", restaurantId);
}