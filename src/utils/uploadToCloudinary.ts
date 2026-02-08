import cloudinary from "../config/cloudinary";

export function uploadBufferToCloudinary(
    buffer: Buffer,
    opts: { folder: string; public_id?: string }
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: opts.folder,
                public_id: opts.public_id,
                resource_type: "image",
                overwrite: true,
            },
            (err, result) => {
                if (err || !result) return reject(err ?? new Error("Upload failed"));
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
        );

        stream.end(buffer);
    });
}