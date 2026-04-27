import mongoose, { Schema, Document } from "mongoose";

export interface IRideOption extends Document {
    title: string;
    title_for_passenger?: string;
    option_id: string;
    description?: string;
    instant?: boolean;
    charge: number;
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
            required: true,
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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IRideOption>("RideOption", RideOptionSchema);