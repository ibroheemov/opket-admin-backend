import mongoose, { Schema, Types } from "mongoose";

interface OrderCounterDoc extends Document {
    restaurantId: Types.ObjectId;
    date: string;
    seq: number;
}

const orderCounterSchema = new Schema<OrderCounterDoc>({
    restaurantId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

orderCounterSchema.index({ restaurantId: 1, date: 1 }, { unique: true });

export const OrderCounterModel = mongoose.model<OrderCounterDoc>(
    "OrderCounter",
    orderCounterSchema
);