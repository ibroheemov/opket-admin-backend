import type { Request } from "express";

export function parseJsonField<T>(raw: any, fallback: T): T {
    if (raw == null || raw === "") return fallback;
    if (typeof raw === "object") return raw as T; // if already parsed by something
    try {
        return JSON.parse(String(raw)) as T;
    } catch {
        return fallback;
    }
}

export function toBool(v: any, fallback = false) {
    if (v == null) return fallback;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
}

export function toNum(v: any, fallback: number) {
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function toOptionalNum(v: any): number | null | undefined {
    if (v == null || v === "") return undefined; // means "don’t change" unless you want clearing behavior
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

// If you want empty => null to explicitly clear:
export function emptyToNull(v: any) {
    if (v == null) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    return v;
}

type UploadedFile = Express.Multer.File;

export async function uploadToStorage(file: UploadedFile, keyPrefix: string): Promise<string> {
    // IMPLEMENT: S3 / Cloudinary / local disk / etc.
    // file.buffer contains the bytes, file.mimetype, file.originalname
    // Return the public URL
    throw new Error("uploadToStorage not implemented");
}