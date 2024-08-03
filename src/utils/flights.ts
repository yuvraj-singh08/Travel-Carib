import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import DuffelClient from "../api-clients/DuffelClient";

const duffelClient = new DuffelClient();

export const getSegment1 = async (from: string, layovers: string[]) => {
    try {
        const firstHalf = layovers.map((layover) => {
            // Assuming you have a duffelClient instance already set up
            return duffelClient.createOfferRequest({
                slices: [
                    {
                        origin: from,
                        destination: layover,
                        departure_date: "2024-08-14",
                        // Optionally include return and layovers if needed
                        // return: new Date(),
                        // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                    }
                ],
                passengers: [{ type: "adult" }],
                cabin_class: "economy",
                max_connections: 2
            });
        });

        const offerRequests = await Promise.all(firstHalf);
        const dataRequest = offerRequests.map((response) => {
            return duffelClient.getOfferRequestById(response.data.id);
        })
        const response = await Promise.all(dataRequest);
        return response;
    } catch (error) {
        throw error
    }
}

export const getSegment2 = async (to: string, layovers: string[]) => {
    try {
        const firstHalf = layovers.map((layover) => {
            // Assuming you have a duffelClient instance already set up
            return duffelClient.createOfferRequest({
                slices: [
                    {
                        origin: layover,
                        destination: to,
                        departure_date: "2024-08-14",
                        // Optionally include return and layovers if needed
                        // return: new Date(),
                        // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                    }
                ],
                passengers: [{ type: "adult" }],
                cabin_class: "economy",
                max_connections: 2
            });
        });

        const offerRequests = await Promise.all(firstHalf);
        const dataRequest = offerRequests.map((response) => {
            return duffelClient.getOfferRequestById(response.data.id);
        })
        const response = await Promise.all(dataRequest);
        return response;
    } catch (error) {
        throw error
    }
}

export const getRoute = (segment1: DuffelResponse<OfferRequest>, segment2: DuffelResponse<OfferRequest>) => {
    const pairs = [];
    segment1?.data?.offers?.forEach(segment1Offer => {
        // const departureTime = offer?.slices[0]?.segments[0]?.departing_at;
        console.log("Start of getRoute", (new Date()))

        const n = segment1Offer?.slices[0]?.segments?.length;
        const arrivalTime = segment1Offer?.slices[0]?.segments[n - 1]?.arriving_at;
        segment2?.data?.offers?.forEach(segment2Offer => {
            const departureTime = segment2Offer?.slices[0]?.segments[0]?.departing_at;
            const dateArrival = new Date(arrivalTime);
            const dateDeparture = new Date(departureTime);
            //@ts-ignore
            const diffInMs = dateArrival - dateDeparture;
            const diffInHours = diffInMs / 3600000;
            if(diffInHours > 2){
                pairs?.push({
                    from: segment1Offer?.slices[0]?.origin,
                    to: segment2Offer?.slices[0]?.destination,
                    layovers: segment1Offer?.slices[0]?.destination,
                    departureTime,
                    arrivalTime,
                    duration: diffInHours ,
                    segments: {
                        segment1: segment1Offer?.slices[0]?.segments,  
                        segment2: segment2Offer?.slices[0]?.segments
                    }
            });
            }
        });
    });
        console.log("End of getRoute", (new Date()))
        return pairs;
}