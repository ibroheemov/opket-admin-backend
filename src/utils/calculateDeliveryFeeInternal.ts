import { config } from "../config/env";
import { haversineDistanceMeters } from "./haversineDistanceMeters";

interface DeliveryFeeParams {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    subtotal?: number;
    freeOverAmount?: number;
}

interface DeliveryFeeResult {
    distanceKm: number;
    rawFee: number;
    fee: number;
    isFree: boolean;
    fallbackUsed: boolean;
}

export async function calculateDeliveryFeeInternal(
    params: DeliveryFeeParams
): Promise<DeliveryFeeResult> {

    const { origin, destination, subtotal, freeOverAmount } = params;

    const FIRST_KM = 5000;
    const PER_KM = 2000;
    const SMALLEST_DISTANCE_FARE = 5000;
    const SMALLEST_DISTANCE = 1000;

    let distanceMeters: number;
    let fallbackUsed = false;

    try {
        const response = await axios.post<{
            routes: { distanceMeters: number }[];
        }>(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {
                origin: {
                    location: {
                        latLng: {
                            latitude: origin.lat,
                            longitude: origin.lng,
                        },
                    },
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: destination.lat,
                            longitude: destination.lng,
                        },
                    },
                },
                travelMode: "DRIVE",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": config.GOOGLE_API_KEY,
                    "X-Goog-FieldMask": "routes.distanceMeters",
                },
            }
        );

        if (!response.data.routes?.length) {
            throw new Error("No routes");
        }

        distanceMeters = response.data.routes[0].distanceMeters;

    } catch (error) {

        console.error("Google failed, fallback to Haversine");

        fallbackUsed = true;

        distanceMeters = haversineDistanceMeters(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng
        );

        /// approximate driving distance
        distanceMeters *= 1.4;
    }

    /// raw pricing
    let rawFee = 0;

    if (distanceMeters <= SMALLEST_DISTANCE) {
        rawFee = SMALLEST_DISTANCE_FARE;
    } else {
        const distanceKm = Math.ceil(distanceMeters / 1000);
        rawFee = FIRST_KM + (distanceKm - 1) * PER_KM;
    }

    /// free delivery rule
    let fee = rawFee;
    let isFree = false;

    if (
        freeOverAmount &&
        subtotal &&
        subtotal >= freeOverAmount
    ) {
        fee = 0;
        isFree = true;
    }

    return {
        distanceKm: distanceMeters / 1000,
        rawFee,
        fee,
        isFree,
        fallbackUsed,
    };
}