import { Types } from "mongoose";
import { MenuItemModel } from "../models/MenuItem";
import { calculateDeliveryFeeInternal } from "./calculateDeliveryFeeInternal";

interface NormalizedItem {
    menuItemId: Types.ObjectId;
    quantity: number;
}

interface PricingResult {
    items: {
        menuItemId: Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        subtotal: number;
    }[];

    pricing: {
        itemsSubtotal: number;
        deliveryFee: number;
        tax: number;
        discount: number;
        total: number;
    };
}

export async function buildOrderPricing(
    restaurantId: Types.ObjectId,
    normalizedItems: NormalizedItem[],
    pickup: { lat: number; lon: number },
    dropoff: { lat: number; lon: number },
    freeOverAmount?: number,

): Promise<PricingResult> {

    const menuItemIds = normalizedItems.map(i => i.menuItemId);

    const menuItems = await MenuItemModel.find({
        _id: { $in: menuItemIds },
        restaurantId
    })
        .select("_id name price is_available")
        .lean();

    if (menuItems.length !== normalizedItems.length) {
        throw new Error("Some menu items not found");
    }

    const map = new Map(menuItems.map(m => [m._id.toString(), m]));

    let itemsSubtotal = 0;

    const orderItems = normalizedItems.map(i => {
        const menu = map.get(i.menuItemId.toString());

        if (!menu) {
            throw new Error("Menu item missing");
        }

        if (!menu.is_available) {
            throw new Error(`${menu.name} is not available`);
        }

        const subtotal = menu.price * i.quantity;

        itemsSubtotal += subtotal;

        return {
            menuItemId: menu._id as any,
            name: menu.name,
            price: menu.price,
            quantity: i.quantity,
            subtotal
        };
    });

    /// delivery fee
    const delivery = await calculateDeliveryFeeInternal({
        origin: { lat: pickup.lat, lng: pickup.lon },
        destination: { lat: dropoff.lat, lng: dropoff.lon },
        subtotal: itemsSubtotal,
        freeOverAmount,
    });

    const deliveryFee = delivery.fee;

    const tax = 0;
    const discount = 0;

    const total =
        itemsSubtotal +
        deliveryFee +
        tax -
        discount;

    return {
        items: orderItems,
        pricing: {
            itemsSubtotal,
            deliveryFee,
            tax,
            discount,
            total
        }
    };
}