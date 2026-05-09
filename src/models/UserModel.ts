import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "CONSUMER" | "COURIER" | "RESTAURANT_OWNER" | "ADMIN";

export interface IUser extends Document {
    fullName: string;
    email?: string;
    phone: string | null;
    role: UserRole;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        fullName: { type: String, required: true, trim: true, maxlength: 120 },
        email: { type: String, trim: true, lowercase: true, index: true, default: null },
        phone: { type: String, required: true, trim: true, index: true },

        role: {
            type: String,
            enum: ["CONSUMER", "COURIER", "RESTAURANT_OWNER", "ADMIN"],
            required: true,
            default: "CONSUMER",
            index: true,
        },

        passwordHash: { type: String, required: true, select: false },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
// If you want phone unique only when present, do a partial unique index:
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });

export const UserModel = mongoose.model<IUser>("User", userSchema);