import mongoose, { Schema, Document, Types } from "mongoose";

export interface IItemOption extends Document {
    groupId: Types.ObjectId;
    name: string;
    price_delta: number;  // cents
    is_available: boolean;
}

const itemOptionSchema = new Schema<IItemOption>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: "ItemOptionGroup", required: true, index: true },
        name: { type: String, required: true, trim: true },
        price_delta: { type: Number, default: 0 },
        is_available: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const ItemOptionModel = mongoose.model<IItemOption>("ItemOption", itemOptionSchema);