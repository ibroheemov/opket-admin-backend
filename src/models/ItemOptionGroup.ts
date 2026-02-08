import mongoose, { Schema, Document, Types } from "mongoose";

export interface IItemOptionGroup extends Document {
    itemId: Types.ObjectId;
    name: string;
    min_select: number;
    max_select: number;
}

const itemOptionGroupSchema = new Schema<IItemOptionGroup>(
    {
        itemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true, index: true },
        name: { type: String, required: true, trim: true },
        min_select: { type: Number, default: 0, min: 0 },
        max_select: { type: Number, default: 1, min: 1 },
    },
    { timestamps: true }
);

export const ItemOptionGroupModel = mongoose.model<IItemOptionGroup>(
    "ItemOptionGroup",
    itemOptionGroupSchema
);