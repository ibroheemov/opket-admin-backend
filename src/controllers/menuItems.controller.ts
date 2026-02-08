import { Request, Response } from "express";
import { MenuItemModel } from "../models/MenuItem";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";

/** GET /restaurants/:id/items */
export const listItems = async (req: Request, res: Response) => {
    const { id: restaurantId } = req.params;
    const { categoryId } = req.query as Record<string, string>;

    const filter: any = { restaurantId };
    if (categoryId) filter.categoryId = categoryId;

    const items = await MenuItemModel.find(filter)
        .sort({ sort_order: 1 })
        .lean();

    res.json({ success: true, items });
};

/** POST /restaurants/:id/items */
export const createItem = async (req: Request, res: Response) => {
    const { id: restaurantId } = req.params;

    let image_url: string | null = null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
            folder: "restaurant/categories/items",
        });

        image_url = uploaded.secure_url;
    }


    const item = await MenuItemModel.create({
        ...req.body,
        restaurantId,
        image_url,
    });

    res.json({ success: true, item });
};

/** PATCH /items/:id */
export const updateItem = async (req: Request, res: Response) => {
    // If using multer .single(...), file will be here when an image is uploaded
    const file = (req as any).file as Express.Multer.File | undefined;

    const update: Record<string, any> = { ...req.body };

    // If an image was uploaded, upload it and set image_url
    if (file) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
            folder: "restaurant/categories/items",
        });

        update.image_url = uploaded.secure_url;
    }

    const item = await MenuItemModel.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true }
    ).lean();

    if (!item) {
        return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, item });
};

/** DELETE /items/:id */
export const deleteItem = async (req: Request, res: Response) => {
    await MenuItemModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
};