import { Request, Response } from "express";
import { MenuCategoryModel } from "../models/MenuCategory";

/** GET /restaurants/:id/categories */
export const listCategories = async (req: Request, res: Response) => {
    const { id: restaurantId } = req.params;
    const categories = await MenuCategoryModel.find({ restaurantId })
        .sort({ sort_order: 1 })
        .lean();

    res.json({ success: true, categories });
};

/** POST /restaurants/:id/categories */
export const createCategory = async (req: Request, res: Response) => {
    const { id: restaurantId } = req.params;
    const { name, sort_order = 0 } = req.body;

    const category = await MenuCategoryModel.create({
        restaurantId,
        name,
        sort_order,
    });

    res.json({ success: true, category });
};

/** PATCH /categories/:id */
export const updateCategory = async (req: Request, res: Response) => {
    const category = await MenuCategoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
    ).lean();

    if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, category });
};

/** DELETE /categories/:id */
export const deleteCategory = async (req: Request, res: Response) => {
    await MenuCategoryModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
};