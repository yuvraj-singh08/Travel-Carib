import { v4 as uuidv4 } from "uuid";
import redis from "../../config/redis";

export const cacheAmadeusResponse = (data: any) => {
    try {
        const dataWithResponseId = data.map((amadeusResponse) => {
            const key = uuidv4();
            redis.set(key, JSON.stringify(amadeusResponse));
            return {
                ...amadeusResponse,
                gdsOfferId: key
            };
        });
        return dataWithResponseId;
    } catch (error) {
        throw error;
    }
}

export const getCachedAmadeusOffer = async (id: string) => {
    try {
        const data = await redis.get(id);
        return JSON.parse(data);
    } catch (error) {
        throw error;
    }
}
