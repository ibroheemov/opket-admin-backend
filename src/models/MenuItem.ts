import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMenuItem extends Document {
    restaurantId: Types.ObjectId;
    categoryId?: Types.ObjectId | null;

    name: string;
    description?: string;
    price: number;         // cents
    is_available: boolean;
    image_url?: string;
    sort_order: number;
}

const menuItemSchema = new Schema<IMenuItem>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "MenuCategory", default: null, index: true },

        name: { type: String, required: true, trim: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 },
        is_available: { type: Boolean, default: true },
        image_url: { type: String },
        sort_order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, sort_order: 1 });

export const MenuItemModel = mongoose.model<IMenuItem>("MenuItem", menuItemSchema);