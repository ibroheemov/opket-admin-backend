import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMenuCategory extends Document {
    restaurantId: Types.ObjectId;
    name: string;
    sort_order: number;
}

const menuCategorySchema = new Schema<IMenuCategory>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
        name: { type: String, required: true, trim: true },
        sort_order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

menuCategorySchema.index({ restaurantId: 1, sort_order: 1 });

export const MenuCategoryModel = mongoose.model<IMenuCategory>("MenuCategory", menuCategorySchema);