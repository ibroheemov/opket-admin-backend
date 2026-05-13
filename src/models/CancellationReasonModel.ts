import mongoose, { Schema } from "mongoose";

const CancellationReasonSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        labelUz: { type: String, required: true },
        count: { type: Number, default: 0, min: 0 },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const CancellationReasonModel = mongoose.model(
    "CancellationReason",
    CancellationReasonSchema
);
