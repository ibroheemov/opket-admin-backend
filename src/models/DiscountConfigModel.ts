import mongoose, { Schema } from "mongoose";

export type DiscountType = "percentage" | "fixed";

export interface IDiscountTier {
    minFare: number;
    maxFare: number | null;
    type: DiscountType;
    value: number;
}

const DiscountTierSchema = new Schema<IDiscountTier>(
    {
        minFare: { type: Number, required: true, default: 0, min: 0 },
        maxFare: { type: Number, default: null },
        type: { type: String, enum: ["percentage", "fixed"], required: true },
        value: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const DiscountConfigSchema = new Schema(
    {
        enabled: { type: Boolean, default: false },
        tiers: { type: [DiscountTierSchema], default: [] },
    },
    { timestamps: true }
);

export const DiscountConfigModel = mongoose.model("DiscountConfig", DiscountConfigSchema);

export async function getDiscountConfigDoc() {
    let doc = await DiscountConfigModel.findOne();
    if (!doc) doc = await DiscountConfigModel.create({ enabled: false, tiers: [] });
    return doc;
}
