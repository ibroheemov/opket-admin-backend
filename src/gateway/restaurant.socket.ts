import { RestaurantSocketConnectionPayload } from "../types/types";
import { restaurantSockets } from "./socket";

export const registerRestaurantHandlers = async ({ socket, restaurantId }: RestaurantSocketConnectionPayload) => {
    restaurantSockets.set(restaurantId, socket.id);

    console.log("Restaurant connected", restaurantId);
}