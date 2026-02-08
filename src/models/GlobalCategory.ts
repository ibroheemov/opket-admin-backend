import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGlobalCategory extends Document {
    name: string;
    sort_order: number;
    image_url: string;
    image_public_id: string;
}

const globalCategorySchema = new Schema<IGlobalCategory>(
    {
        name: { type: String, required: true, trim: true },
        sort_order: { type: Number, default: 0 },
        image_url: { type: String, default: null },
        image_public_id: { type: String, default: null },
    },
    { timestamps: true }
);

globalCategorySchema.index({ sort_order: 1 });

export const GlobalCategoryModel = mongoose.model<IGlobalCategory>("GlobalCategory", globalCategorySchema);