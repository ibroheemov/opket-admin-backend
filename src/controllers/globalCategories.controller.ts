import { Request, Response } from "express";
import { GlobalCategoryModel } from "../models/GlobalCategory";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary";


/** GET /food/categories */
export const listCategories = async (req: Request, res: Response) => {
    const categories = await GlobalCategoryModel.find()
        .sort({ sort_order: 1 })
        .lean();

    res.json({ success: true, categories });
};

/** POST /food/categories */
export const createCategory = async (req: Request, res: Response) => {
    const { name, sort_order = 0 } = req.body;

    let image_url: string | null = null;
    let image_public_id: string | null = null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
            folder: "food/categories",
        });

        image_url = uploaded.secure_url;
        image_public_id = uploaded.public_id;
    }

    const category = await GlobalCategoryModel.create({
        name,
        sort_order,
        image_url,
        image_public_id,
    });

    res.json({ success: true, category });
};

/** PATCH /food/categories/:id */
export const updateCategory = async (req: Request, res: Response) => {
    const { name, sort_order } = req.body;

    const existing = await GlobalCategoryModel.findById(req.params.id);
    if (!existing) {
        return res.status(404).json({ success: false, message: "Category not found" });
    }

    // 1) If a new file is provided, upload and replace
    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
            folder: "food/categories",
        });

        // delete old image if exists
        if (existing.image_public_id) {
            await deleteFromCloudinary(existing.image_public_id);
        }

        existing.image_url = uploaded.secure_url;
        existing.image_public_id = uploaded.public_id;
    }

    // 2) Update normal fields (only if provided)
    if (typeof name !== "undefined") existing.name = name;
    if (typeof sort_order !== "undefined") existing.sort_order = Number(sort_order);

    await existing.save();

    res.json({ success: true, category: existing.toObject() });
};

/** DELETE /food/categories/:id */
export const deleteCategory = async (req: Request, res: Response) => {
    const existing = await GlobalCategoryModel.findById(req.params.id);
    if (!existing) {
        return res.json({ success: true });
    }

    if (existing.image_public_id) {
        await deleteFromCloudinary(existing.image_public_id);
    }

    await existing.deleteOne();
    res.json({ success: true });
};