import { FlightOfferSearchParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient";
import { amadeusNewParser, combineAllRoutes, combineResponses, duffelNewParser, filterResponse, getPossibleRoutes, normalizeResponse, parseAmadeusResponse, parseDuffelResponse, sortResponse } from "../utils/flights";
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

    async advanceFlightSearch(params: FlightOfferSearchParams) {
        try {
            //Calculating Possible Routes
            const possibleRoutes = [
                [
                    {
                        origin: params.originLocation,
                        destination: params.destinationLocation
                    }
                ]
            ]
            if (params.filters?.SelfTransferAllowed === true || params.filters?.SelfTransferAllowed === undefined) {
                possibleRoutes.push(...getPossibleRoutes(params.originLocation, params.destinationLocation, 4))
            }
            console.log(possibleRoutes);

            //Duffel Request
            const duffelRequests = possibleRoutes.map((route) => {
                return route.map((segment) => {
                    return this.duffelClient.createOfferRequest({
                        passengers: [{ type: "adult" }],
                        cabin_class: params.cabinClass,
                        max_connections: 2,
                        slices: [
                            {
                                origin: segment.origin,
                                destination: segment.destination,
                                departure_date: params.departureDate,
                            }
                        ],
                    })
                })
            })

            //Kiu Request
            const kiuRequests = possibleRoutes.map((route) => {
                return route.map((segment) => {
                    return this.kiuClient.searchFlights({
                        DepartureDate: params.departureDate,
                        OriginLocation: segment.origin,
                        DestinationLocation: segment.destination,
                        Passengers: "1",
                    })
                })
            })

            let index = 0;
            const amadeusRequests = possibleRoutes.map((route) => {
                return route.map((segment) => {
                    return this.amadeusClient.searchFlights({
                        departure: params.departureDate,
                        arrival: params.departureDate,
                        locationDeparture: segment.origin,
                        locationArrival: segment.destination,
                        adults: params.passengerType,
                    }, index++)
                })
            })

            const [duffelResponse, amadeusResponse, parsedKiuResponse] = await Promise.all([
                Promise.all(duffelRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
                Promise.all(amadeusRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
                Promise.all(kiuRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
            ])

            const parsedAmadeusResponse = amadeusResponse?.map((possibleRoute) => {
                const parsedPossibleRoutes = possibleRoute.map((response) => {
                    const parsedResponse = amadeusNewParser(response);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            const parsedDuffelResponse = duffelResponse.map((possibleRoutes) => {
                const parsedPossibleRoutes = possibleRoutes.map((response) => {
                    const parsedResponse = duffelNewParser(response);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            let combination: any = [];

            possibleRoutes.forEach((route, index) => {
                const duffel = parsedDuffelResponse?.[index]
                const amadeus = parsedAmadeusResponse?.[index]
                const temp = [];
                route.forEach((data, index2) => {
                    temp.push([
                        ...(amadeus?.[index2] || []),
                        ...(duffel?.[index2] || [])
                    ])
                })
                const paired = combineAllRoutes(temp)
                if (paired.length > 0)
                    combination.push(paired)
            })

            let temp: any = []

            combination.forEach((route) => {
                temp.push(...route)
            })

            const normalizedResponse = normalizeResponse(temp)
            //@ts-ignore
            const filteredResponse = filterResponse(normalizedResponse, params.filters)
            const sortedResponse = sortResponse(filteredResponse);

            return sortedResponse;
        } catch (error) {
            throw (error);
        }
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
                parsedKiuResponse = [...parsedKiuResponse, ...parsedResponse]
            });
            if (parsedAmadeusResponse === undefined) parsedAmadeusResponse = []

            const combinedResponse = combineResponses([...parsedDuffelResponse, ...parsedAmadeusResponse, ...parsedKiuResponse])
            return combinedResponse
        } catch (error) {
            throw (error);
        }
    }


}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;