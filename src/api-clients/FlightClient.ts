import { FlightOfferSearchParams } from "../../types/flightTypes";
import { combineResponses, getPossibleRoutes, parseAmadeusResponse, parseDuffelResponse} from "../utils/flights";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";

class FlightClient {
    private duffelClient: DuffelClientInstance
    private amadeusClient: AmadeusClientInstance

    constructor() {
        this.duffelClient = new DuffelClient();
        this.amadeusClient = new AmadeusClient();
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

            const amadeusRequest = possibleRoutes.map((route) => {
                const request = this.amadeusClient.multiCityFlightSearch({
                    routeSegments: route,
                    passengers: 2,
                    departureDate: params.departureDate
                })
                return request
            })
            const [duffelResponse, amadeusResponse] = await Promise.all([
                Promise.all(duffelRequests),
                Promise.all(amadeusRequest)
            ])
            const parsedAmadeusResponse = parseAmadeusResponse(amadeusResponse).map((data) => {
                return {...data, cabin_class: params.cabinClass}
            })
            const parsedDuffelResponse = parseDuffelResponse(duffelResponse).map((data) => {
                return {...data, cabin_class: params.cabinClass}
            })
            const combinedResponse = combineResponses([...parsedDuffelResponse, ...parsedAmadeusResponse])
            return combinedResponse
        } catch (error) {
            throw (error);
        }
    }


}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;