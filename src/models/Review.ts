import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
    orderId: Types.ObjectId;
    restaurantId: Types.ObjectId;
    rating: number;
    comment?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: null, maxlength: 1000 },
    },
    { timestamps: true }
);

reviewSchema.index({ restaurantId: 1, createdAt: -1 });

export const ReviewModel = mongoose.model<IReview>("Review", reviewSchema);
