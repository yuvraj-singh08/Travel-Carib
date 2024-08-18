import { FlightOfferSearchParams } from "../../types/flightTypes";
import { combineResponses, getPossibleRoutes, parseAmadeusResponse, parseDuffelResponse } from "../utils/flights";
import { parseKiuResposne } from "../utils/kiu";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";
import KiuClient, { KiuClientInstance } from "./KiuClient";

class FlightClient {
    private duffelClient: DuffelClientInstance
    private amadeusClient: AmadeusClientInstance
    private kiuClient: KiuClientInstance

    constructor() {
        this.duffelClient = new DuffelClient();
        this.amadeusClient = new AmadeusClient();
        this.kiuClient = new KiuClient();
    }

    async flightSearch(params: FlightOfferSearchParams) {
        try {
            const possibleRoutes = [
                [
                    {
                        origin: params.originLocation,
                        destination: params.destinationLocation
                    }
                ],
                ...(getPossibleRoutes(params.originLocation, params.destinationLocation, params.maxLayovers))
            ]
            console.log(possibleRoutes)
            const duffelRequests = possibleRoutes.map((route) => {
                const slices = route.map((data) => {
                    return {
                        origin: data.origin,
                        destination: data.destination,
                        departure_date: params.departureDate,
                    }
                })
                return this.duffelClient.createOfferRequest({
                    slices,
                    passengers: [{ type: "adult" }],
                    cabin_class: params.cabinClass,
                    max_connections: 2
                })
            })

            const amadeusRequest = possibleRoutes.map((route, index) => {
                const request = this.amadeusClient.multiCityFlightSearch({
                    routeSegments: route,
                    passengers: 2,
                    departureDate: params.departureDate,
                    index
                })
                return request
            })

            const kiuRequest = possibleRoutes.map((route) => {
                const request = this.kiuClient.multiCitySearch({
                    routeSegments: route,
                    departureDate: params.departureDate,
                    passengers: 1
                })
                return request
            })
            const [duffelResponse, amadeusResponse, kiuResponse] = await Promise.all([
                Promise.all(duffelRequests),
                Promise.all(amadeusRequest),
                Promise.all(kiuRequest)
            ])
            let parsedAmadeusResponse = parseAmadeusResponse(amadeusResponse)?.map((data) => {
                return { ...data, cabin_class: params.cabinClass }
            })
            const parsedDuffelResponse = parseDuffelResponse(duffelResponse)?.map((data) => {
                return { ...data, cabin_class: params.cabinClass }
            })
            let parsedKiuResponse = [];

            kiuResponse.forEach((response: any) => {
                const parsedResponse = parseKiuResposne(response);
                parsedKiuResponse = [...parsedKiuResponse,...parsedResponse]
            });
            if(parsedAmadeusResponse === undefined) parsedAmadeusResponse = []
            
            const combinedResponse = combineResponses([...parsedDuffelResponse, ...parsedAmadeusResponse,...parsedKiuResponse])
            return combinedResponse
        } catch (error) {
            throw (error);
        }
    }


}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;