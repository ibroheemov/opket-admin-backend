import mongoose, { Schema, Document } from "mongoose";

export interface IRideSearchConfig extends Document {
    searchDurationMs: number;
    maxOffersPerDriver: number;
    reofferAfterMs: number;
    stage1RadiusKm: number;
    stage1TtlMs: number;
    stage1BatchSize: number;
    stage2RadiusKm: number;
    stage2TtlMs: number;
    stage2BatchSize: number;
    stage3RadiusKm: number;
    stage3TtlMs: number;
    stage4RadiusKm: number;
    stage4TtlMs: number;
}

const RideSearchConfigSchema = new Schema<IRideSearchConfig>(
    {
        searchDurationMs: { type: Number, required: true, default: 3 * 60 * 1000 },
        maxOffersPerDriver: { type: Number, required: true, default: 2 },
        reofferAfterMs: { type: Number, required: true, default: 10_000 },
        stage1RadiusKm: { type: Number, required: true, default: 1 },
        stage1TtlMs: { type: Number, required: true, default: 9000 },
        stage1BatchSize: { type: Number, required: true, default: 3 },
        stage2RadiusKm: { type: Number, required: true, default: 1.5 },
        stage2TtlMs: { type: Number, required: true, default: 9000 },
        stage2BatchSize: { type: Number, required: true, default: 3 },
        stage3RadiusKm: { type: Number, required: true, default: 2 },
        stage3TtlMs: { type: Number, required: true, default: 15000 },
        stage4RadiusKm: { type: Number, required: true, default: 2 },
        stage4TtlMs: { type: Number, required: true, default: 25000 },
    },
    { timestamps: true }
);

export const RideSearchConfigModel = mongoose.model<IRideSearchConfig>(
    "RideSearchConfig",
    RideSearchConfigSchema
);

export const DEFAULT_RIDE_SEARCH_CONFIG = {
    searchDurationMs: 3 * 60 * 1000,
    maxOffersPerDriver: 2,
    reofferAfterMs: 10_000,
    stage1RadiusKm: 1,
    stage1TtlMs: 9000,
    stage1BatchSize: 3,
    stage2RadiusKm: 1.5,
    stage2TtlMs: 9000,
    stage2BatchSize: 3,
    stage3RadiusKm: 2,
    stage3TtlMs: 15000,
    stage4RadiusKm: 2,
    stage4TtlMs: 25000,
};
