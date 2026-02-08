// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

export async function deleteFromCloudinary(publicId: string) {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
}