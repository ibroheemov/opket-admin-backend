import mongoose, { Schema, Document } from "mongoose";

export interface IAppVersionConfig extends Document {
    passenger_min_version: string;
    passenger_latest_version: string;
    driver_min_version: string;
    driver_latest_version: string;
}

const AppVersionConfigSchema = new Schema<IAppVersionConfig>(
    {
        passenger_min_version: { type: String, required: true, default: "1.0.0" },
        passenger_latest_version: { type: String, required: true, default: "1.0.0" },
        driver_min_version: { type: String, required: true, default: "1.0.0" },
        driver_latest_version: { type: String, required: true, default: "1.0.0" },
    },
    { timestamps: true }
);

export const AppVersionConfigModel = mongoose.model<IAppVersionConfig>(
    "AppVersionConfig",
    AppVersionConfigSchema
);

export async function getAppVersionConfig(): Promise<IAppVersionConfig> {
    let doc = await AppVersionConfigModel.findOne();
    if (!doc) {
        doc = await AppVersionConfigModel.create({
            passenger_min_version: "1.0.0",
            passenger_latest_version: "1.0.0",
            driver_min_version: "1.0.0",
            driver_latest_version: "1.0.0",
        });
    }
    return doc;
}
