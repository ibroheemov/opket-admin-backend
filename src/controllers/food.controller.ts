import { Request, Response } from "express";
import { MenuItemModel } from "../models/MenuItem";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";
import { OrderFoodTypes } from "../types/food.types";

/** GET /restaurants/:id/items */
export const orderFood = async (req: Request, res: Response) => {
    const { restaurantId, items } = req.body as OrderFoodTypes;

    console.log(restaurantId);
    console.log(items);

    // const { categoryId } = req.query as Record<string, string>;

    // const filter: any = { restaurantId };
    // if (categoryId) filter.categoryId = categoryId;

    // const items = await MenuItemModel.find(filter)
    //     .sort({ sort_order: 1 })
    //     .lean();

    res.json({ success: true });
};