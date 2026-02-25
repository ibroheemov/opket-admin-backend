import mongoose, { Schema, Document, Types } from "mongoose";

/** Client sends: { menuItemId: string, quantity: number } */
export interface MenuItemType {
    menuItemId: string;
    quantity: number;
}

export type OrderStatus =
    | "PLACED"
    | "ACCEPTED_BY_RESTAURANT"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "PICKED_UP"
    | "ON_THE_WAY"
    | "DELIVERED"
    | "CANCELLED_BY_CONSUMER"
    | "CANCELLED_BY_RESTAURANT"
    | "CANCELLED_NO_COURIER";

export interface OrderModelDoc extends Document {
    restaurantId: Types.ObjectId;
    courierId?: Types.ObjectId | null;
    consumerId: Types.ObjectId;

    items: Array<{
        menuItemId: Types.ObjectId;
        quantity: number;
    }>;

    dropoff: { lat: number; lon: number };
    pickup: { lat: number; lon: number };

    status: OrderStatus;
    statusHistory: Array<{
        status: OrderStatus;
        at: Date;
        by?: Types.ObjectId;
        note?: string;
    }>;

    cancelReason?: string;

    // handy for dashboard tracking
    isActive: boolean; // computed-ish flag you update on status changes
}

const latLonSchema = new Schema(
    {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lon: { type: Number, required: true, min: -180, max: 180 },
    },
    { _id: false }
);

const orderItemSchema = new Schema(
    {
        menuItemId: { type: Schema.Types.ObjectId, required: true, ref: "MenuItem" },
        quantity: { type: Number, required: true, min: 1, max: 999 },
    },
    { _id: false }
);

const statusHistorySchema = new Schema(
    {
        status: {
            type: String,
            required: true,
            enum: [
                "PLACED",
                "ACCEPTED_BY_RESTAURANT",
                "PREPARING",
                "READY_FOR_PICKUP",
                "PICKED_UP",
                "ON_THE_WAY",
                "DELIVERED",
                "CANCELLED_BY_CONSUMER",
                "CANCELLED_BY_RESTAURANT",
                "CANCELLED_NO_COURIER",
            ],
        },
        at: { type: Date, required: true, default: Date.now },
        by: { type: Schema.Types.ObjectId, required: false },
        note: { type: String, required: false, maxlength: 500 },
    },
    { _id: false }
);

const orderSchema = new Schema<OrderModelDoc>(
    {
        restaurantId: { type: Schema.Types.ObjectId, required: true, ref: "Restaurant", index: true },
        courierId: { type: Schema.Types.ObjectId, required: false, ref: "Courier", default: null, index: true },
        consumerId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },

        items: { type: [orderItemSchema], required: true, validate: [(v: any[]) => v.length > 0, "Items cannot be empty"] },

        dropoff: { type: latLonSchema, required: true },
        pickup: { type: latLonSchema, required: true },

        status: {
            type: String,
            required: true,
            default: "PLACED",
            enum: [
                "PLACED",
                "ACCEPTED_BY_RESTAURANT",
                "PREPARING",
                "READY_FOR_PICKUP",
                "PICKED_UP",
                "ON_THE_WAY",
                "DELIVERED",
                "CANCELLED_BY_CONSUMER",
                "CANCELLED_BY_RESTAURANT",
                "CANCELLED_NO_COURIER",
            ],
            index: true,
        },

        statusHistory: { type: [statusHistorySchema], required: true, default: [] },

        cancelReason: { type: String, required: false, maxlength: 300 },

        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true }
);

// Keep isActive in sync (simple rule)
orderSchema.pre("save", function (next) {
    const terminal = new Set<OrderStatus>([
        "DELIVERED",
        "CANCELLED_BY_CONSUMER",
        "CANCELLED_BY_RESTAURANT",
        "CANCELLED_NO_COURIER",
    ]);
    this.isActive = !terminal.has(this.status);
    next();
});

export const OrderModel = mongoose.model<OrderModelDoc>("Order", orderSchema);