// One-shot migration: assign a unique slug to every existing Restaurant.
// Run: npx ts-node src/scripts/backfill-restaurant-slugs.ts
import mongoose from "mongoose";
import { connectDB } from "../utils/db";
import { RestaurantModel } from "../models/Restaurant";
import { slugify } from "../utils/slugify";

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (true) {
        const existing = await RestaurantModel.findOne({ slug }).select("_id").lean();
        if (!existing || (ignoreId && String(existing._id) === ignoreId)) return slug;
        i += 1;
        slug = `${base}-${i}`;
    }
}

async function main() {
    await connectDB();
    const docs = await RestaurantModel.find({
        $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
    }).lean();
    console.log(`Backfilling slugs for ${docs.length} restaurants...`);
    for (const r of docs) {
        const base = slugify((r as any).name || "restoran");
        const slug = await uniqueSlug(base, String(r._id));
        await RestaurantModel.updateOne({ _id: r._id }, { $set: { slug } });
        console.log(`${(r as any).name} -> ${slug}`);
    }
    await mongoose.disconnect();
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
