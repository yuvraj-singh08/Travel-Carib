import { flightsRoutes } from "../../constants/flightRoutes";
import { FlightOfferSearchParams } from "../../types/flightTypes";
import { getRoute } from "../utils/flights";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";

class FlightClient {
    private duffelClient: DuffelClientInstance

    constructor() {
        this.duffelClient = new DuffelClient();
        this.getSegment1 = this.getSegment1.bind(this);
        this.getSegment2 = this.getSegment2.bind(this);
        this.flightOfferSearch = this.flightOfferSearch.bind(this);
    }

    async flightOfferSearch(params: FlightOfferSearchParams) {
        try {
            const flights = flightsRoutes.filter((flight): boolean | void => {
                if (flight.from === params.originLocation && flight.to === params.destinationLocation)
                    return true;
            })
            const [segment1, segment2] = await Promise.all([
                this.getSegment1(flights[0].from, flights[0].layovers),
                this.getSegment2(flights[0].to, flights[0].layovers)
            ])
            const response = []
            for (let i = 0; i < segment1.length; i++) {
                const pairs = getRoute(segment1[i], segment2[i])
                response.push(...pairs)
            }
            return response
        } catch (error) {
            throw error;
        }
    }

    async getSegment1(from: string, layovers: string[]) {
        try {
            const firstHalf = layovers.map((layover) => {
                // Assuming you have a duffelClient instance already set up
                return this.duffelClient.createOfferRequest({
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
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const response = await Promise.all(dataRequest);
            return response;
        } catch (error) {
            throw error
        }
    }

    async getSegment2(to: string, layovers: string[]) {
        try {
            const firstHalf = layovers.map((layover) => {
                // Assuming you have a this.duffelClient instance already set up
                return this.duffelClient.createOfferRequest({
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
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const response = await Promise.all(dataRequest);
            return response;
        } catch (error) {
            throw error
        }
    }
}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;