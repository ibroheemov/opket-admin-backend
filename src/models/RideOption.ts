import mongoose, { Schema, Document } from "mongoose";

export interface IRideOption extends Document {
    title: string;
    title_for_passenger?: string;
    option_id: string;
    description?: string;
    instant?: boolean;
    charge: number;
    sort_order: number;
    show_in_passenger_app: boolean;
    show_in_driver_app: boolean;
    createdAt: Date;
    updatedAt: Date;
    type?: string;
}

const RideOptionSchema: Schema = new Schema(
    {
        type: {
            type: String,
            enum: ["passenger", "driver"]
        },
        title: {
            type: String,
            trim: true,
        },
        title_for_passenger: {
            type: String,
            trim: true,
        },
        option_id: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
        },
        instant: {
            type: Boolean,
            default: false,
        },
        charge: {
            type: Number,
            required: true,
        },
        sort_order: {
            type: Number,
            default: 0,
        },
        show_in_passenger_app: {
            type: Boolean,
            default: true,
        },
        show_in_driver_app: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IRideOption>("RideOption", RideOptionSchema);