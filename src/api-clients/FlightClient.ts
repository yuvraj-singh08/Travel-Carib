import { FlightSupplier } from "@prisma/client";
import { FlightOfferSearchParams, MultiCitySearchParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient";
import { amadeusNewParser, combineAllRoutes, combineMultiCityRoutes, combineResponses, duffelNewParser, filterResponse, getPossibleRoutes, getSearchManagementRoutes, normalizeMultiResponse, normalizeResponse, sortResponse } from "../utils/flights";
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

    async multiCityFlightSearch(params: MultiCitySearchParams) {
        const requests = params.FlightDetails.map(async (data) => {
            return await this.advanceFlightSearch({
                originLocation: data.originLocation,
                destinationLocation: data.destinationLocation,
                departureDate: data.departureDate,
                passengerType: params.passengerType,
                maxLayovers: params.maxLayovers,
                cabinClass: params.cabinClass,
                filters: params.filters,
                sortBy: params.sortBy
            })
        })

        const response = await Promise.all(requests);

        const combinedRoutes = combineMultiCityRoutes(response);
        const normalizedResponse = normalizeMultiResponse(combinedRoutes);
        const sortedResponse = sortResponse(normalizedResponse, params.sortBy);
        const result = sortedResponse.filter((route, index) => {
            if (index < 30) {
                return true;
            }
            return false;
        })

        return result;
    }

    async advanceFlightSearch(params: FlightOfferSearchParams) {
        try {
            //Calculating Possible Routes
            const firewall = await prisma.firewall.findMany({})
            const allFirewall = [], kiuFirewall = [], amadeusFirewall = [], duffelFirewall = [];
            firewall.forEach((firewall) => {
                //@ts-ignore
                if (firewall.supplier === FlightSupplier.DUFFEL || firewall.supplier === FlightSupplier.ALL) {
                    duffelFirewall.push(firewall)
                }
                //@ts-ignore
                if (firewall.supplier === FlightSupplier.AMADEUS || firewall.supplier === FlightSupplier.ALL) {
                    amadeusFirewall.push(firewall)
                }
                //@ts-ignore
                if (firewall.supplier === FlightSupplier.KIUSYS || firewall.supplier === FlightSupplier.ALL) {
                    kiuFirewall.push(firewall)
                }
                //@ts-ignore
                if (firewall.supplier === FlightSupplier.ALL) {
                    allFirewall.push(firewall)
                }
            })
            const searchManagement = params.filters.SelfTransferAllowed === undefined || params.filters.SelfTransferAllowed ? await getSearchManagementRoutes(params.originLocation, params.destinationLocation, 4, allFirewall) : { possibleRoutes: [[{ origin: params.originLocation, destination: params.destinationLocation }]], searchManagement: "ff" }
            const possibleRoutes = searchManagement.possibleRoutes
            const kiuPossibleRoutes = possibleRoutes.filter((route) => {
                let flag = true;
                let routeId = "";
                route.forEach((route) => {
                    routeId += route.origin + route.destination + ","
                })
                kiuFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId.includes(id) && !firewall.code) {
                        flag = false;
                    }
                })
                return flag
            })
            const amaduesPossibleRoutes = possibleRoutes.filter((route) => {
                let flag = true;
                let routeId = "";
                route.forEach((route) => {
                    routeId += route.origin + route.destination + ","
                })
                amadeusFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId.includes(id) && !firewall.code) {
                        flag = false;
                    }
                })
                return flag
            })
            const duffelPossibleRoutes = possibleRoutes.filter((route) => {
                let flag = true;
                let routeId = "";
                route.forEach((route) => {
                    routeId += route.origin + route.destination + ","
                })
                duffelFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId.includes(id) && !firewall.code) {
                        flag = false;
                    }
                })
                return flag
            })
            console.log(possibleRoutes);

            //Duffel Request
            const duffelRequests = duffelPossibleRoutes.map((route) => {
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
            const kiuRequests = kiuPossibleRoutes.map((route) => {
                return route.map((segment) => {
                    return this.kiuClient.searchFlights({
                        DepartureDate: params.departureDate,
                        OriginLocation: segment.origin,
                        DestinationLocation: segment.destination,
                        Passengers: "1",
                        CabinClass: params.cabinClass,
                    }, kiuFirewall)
                })
            })

            let index = 0;
            const amadeusRequests = amaduesPossibleRoutes.map((route) => {
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
                    const parsedResponse = amadeusNewParser(response, amadeusFirewall);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            const parsedDuffelResponse = duffelResponse.map((possibleRoutes) => {
                const parsedPossibleRoutes = possibleRoutes.map((response) => {
                    const parsedResponse = duffelNewParser(response, duffelFirewall);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            let combination: any = [];

            possibleRoutes.forEach((route, index) => {
                const duffel = parsedDuffelResponse?.[index]
                const amadeus = parsedAmadeusResponse?.[index]
                const kiu = parsedKiuResponse?.[index]
                const temp = [];
                route.forEach((data, index2) => {
                    temp.push([
                        ...(amadeus?.[index2] || []),
                        ...(duffel?.[index2] || []),
                        ...(kiu?.[index2] || [])
                    ])
                })
                const paired = combineAllRoutes(temp, { maxTime: searchManagement?.searchManagement?.[0]?.maxConnectionTime, minTime: searchManagement?.searchManagement?.[0]?.minConnectionTime })
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
            const sortedResponse = sortResponse(filteredResponse, params.sortBy);
            const result = sortedResponse.filter((route, index) => {
                if (index < 60) {
                    return true;
                }
                return false;
            })
            return result;

        } catch (error) {
            throw (error);
        }
    }

}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;