import { redis } from "../utils/redisClient";

export class DriverStore {

    async getAllGeoDrivers(): Promise<{ driverId: string; latitude: number; longitude: number }[]> {
        const driverIds = await redis.zRange("drivers:geo:standard", 0, -1);
        if (!driverIds.length) return [];

        const positions = await redis.geoPos("drivers:geo:standard", driverIds);

        const drivers: { driverId: string; latitude: number; longitude: number }[] = [];

        for (let i = 0; i < driverIds.length; i++) {
            const coords = positions[i];
            if (!coords) continue;

            // Depending on client version, coords is an object
            const longitude = typeof coords === "object" && "longitude" in coords ? coords.longitude : coords[0];
            const latitude = typeof coords === "object" && "latitude" in coords ? coords.latitude : coords[1];

            drivers.push({
                driverId: driverIds[i],
                latitude: Number(latitude),
                longitude: Number(longitude),
            });
        }

        return drivers;
    }

    /* ----------------- GEO Radius Search ----------------- */

    async getDriversInRadius(
        centerLat: number,
        centerLon: number,
        radiusKm: number
    ): Promise<{ driverId: string; latitude: number; longitude: number }[]> {

        const results = await redis.geoSearchWith(
            "drivers:geo",
            {
                longitude: centerLon,
                latitude: centerLat,
            },
            {
                radius: radiusKm,
                unit: "km",
            },
            []
        );

        if (!results || !Array.isArray(results)) return [];

        return results.map((item: any) => {
            const [driverId, coords] = item;
            const [longitude, latitude] = coords;

            return {
                driverId,
                latitude: Number(latitude),
                longitude: Number(longitude),
            };
        });
    }


}

export const driverStoreRedis = new DriverStore();
