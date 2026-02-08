import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRestaurant extends Document {
    ownerUserId?: Types.ObjectId;
    name: string;
    phone: string;

    address_line1: string;
    address_line2?: string;
    city: string;
    region: string;
    postal_code?: string;

    lat?: number | null;
    lng?: number | null;

    is_open: boolean;
    hours_json?: any;

    min_order_amount?: number | null;   // cents
    delivery_fee_base?: number | null;  // cents
    createdAt: Date;
    updatedAt: Date;

    banner_url: string;
    banner_public_id: string;
}

const restaurantSchema = new Schema<IRestaurant>(
    {
        ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },

        address_line1: { type: String, required: true },
        address_line2: { type: String },
        city: { type: String, required: true },
        region: { type: String, required: true },
        postal_code: { type: String },

        lat: { type: Number, default: null },
        lng: { type: Number, default: null },

        is_open: { type: Boolean, default: true },
        hours_json: { type: Schema.Types.Mixed },

        min_order_amount: { type: Number, default: null },
        delivery_fee_base: { type: Number, default: null },

        banner_url: { type: String, default: null },
        banner_public_id: { type: String, default: null },
    },
    { timestamps: true }
);

restaurantSchema.index({ ownerUserId: 1 });
restaurantSchema.index({ name: "text", phone: "text", city: "text", region: "text" });

export const RestaurantModel = mongoose.model<IRestaurant>("Restaurant", restaurantSchema);