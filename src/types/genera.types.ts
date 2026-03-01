
export interface DeliveryFeeRequestBody {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number },
    freeOverAmount?: number,
    subtotal: number;
}

export type GoogleRoutesResponse = {
    routes: {
        distanceMeters: number;
        duration: string;
    }[];
};