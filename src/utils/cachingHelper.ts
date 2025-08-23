import { MiniOffer, Offer } from "../../types/flightTypes";
import { v4 as uuidv4 } from 'uuid';
import redis from "../../config/redis";

export const cacheOffer = async (offer: Offer): Promise<Partial<MiniOffer>> => {
    const uuid = uuidv4();
    const cacheKey = `offer:${uuid}`;
    const cacheValue = offer;
    const cachePromise = new Promise((resolve, reject) => {
        redis.set(cacheKey, JSON.stringify(cacheValue), (err, reply) => {
            if (err) {
                reject(err);
            }
            const slices = offer.slices.map((slice) => {
                return {
                    origin: {
                        iata_code: slice.origin.iata_code,
                    },
                    destination: {
                        iata_code: slice.destination.iata_code,
                    },
                    departureDate: slice.segments[0].departing_at,
                    arrivalDate: slice.segments[slice.segments.length - 1].arriving_at,
                }
            })
            const miniOffer = {
                id: cacheKey,
                origin: {
                    iata_code: offer.slices[0].origin.iata_code,
                },
                destination: {
                    iata_code: offer.slices[offer.slices.length - 1].destination.iata_code,
                },
                departureDate: offer.departing_at,
                arrivalDate: offer.arriving_at, 
                totalAmount: offer.total_amount,
                responseId: offer.responseId,
                routeId: offer.routeId,
                checkedBaggage: offer.checkedBaggage,
                cabinBaggage: offer.cabinBaggage,
                commissionAmount: offer.commissionAmount,
                stops: offer.stops,
                minOnwardDuration: offer.minOnwardDuration,
                maxOnwardDuration: offer.maxOnwardDuration,
                slices: slices,
            }
            resolve(miniOffer);
        });
    });
    return cachePromise as Promise<Partial<MiniOffer>>;
}

export const getCachedOffer = async (cacheKey: string): Promise<Offer | null> => {
    const cachedResponse = await redis.get(cacheKey);
    if (cachedResponse) {
        return JSON.parse(cachedResponse);
    }
    return null;
}