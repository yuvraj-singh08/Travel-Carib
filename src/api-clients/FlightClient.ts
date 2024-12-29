import { FlightSupplier } from "@prisma/client";
import { FlightOfferSearchParams, MultiCitySearchParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient";
import { amadeusNewParser, combineAllRoutes, combineMultiCityRoutes, combineResponses, duffelNewParser, filterResponse, getPossibleRoutes, getSearchManagementRoutes, normalizeMultiResponse, normalizeResponse, sortMultiCityResponse, sortResponse } from "../utils/flights";
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
                passengers: params.passengers,
                sortBy: params.sortBy
            })
        })

        const response = await Promise.all(requests);

        const combinedRoutes = combineMultiCityRoutes(response);
        const normalizedResponse = normalizeMultiResponse(combinedRoutes);
        const sortedResponse = sortMultiCityResponse(normalizedResponse, params.sortBy);
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
            const [firewall, commission] = await Promise.all([
                prisma.firewall.findMany({}),
                prisma.commissionManagement.findMany()
            ])
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
            const kiuCommission = commission.filter((c) => c.supplier === "KIUSYS")?.[0];
            const amadeusCommission = commission.filter((c) => c.supplier === "AMADEUS")?.[0];
            const duffelCommission = commission.filter((c) => c.supplier === "DUFFEL")?.[0];
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

            const duffelPassengersArray = [], amadeusPassengersArray = [];
            for (let i = 0; i < params.passengers.adults; i++) {
                duffelPassengersArray.push({
                    type: 'adult'
                })
                amadeusPassengersArray.push({
                    id: i+1,
                    travelerType: "ADULT",
                    fareOptions: [
                        "STANDARD"
                    ]
                },)
            }
            for (let i = 0; i < params.passengers.children; i++) {
                duffelPassengersArray.push({
                    type: 'child'
                })
                amadeusPassengersArray.push({
                    id: i+1,
                    travelerType: "ADULT",
                    fareOptions: [
                        "STANDARD"
                    ]
                },)
            }
            for (let i = 0; i < params.passengers.infants; i++) {
                duffelPassengersArray.push({
                    type: 'infant_without_seat'
                })
                amadeusPassengersArray.push({
                    id: i+1,
                    travelerType: "ADULT",
                    fareOptions: [
                        "STANDARD"
                    ]
                },)
            }

            //Duffel Request
            const duffelRequests = duffelPossibleRoutes.map((route) => {
                return route.map((segment) => {
                    return this.duffelClient.createOfferRequest({
                        passengers: duffelPassengersArray,
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
                        Passengers: params.passengers,
                        CabinClass: params.cabinClass,
                    }, kiuFirewall, kiuCommission)
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
                        passengers: amadeusPassengersArray,
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
                    const parsedResponse = amadeusNewParser(response, amadeusFirewall, amadeusCommission);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            const parsedDuffelResponse = duffelResponse.map((possibleRoutes) => {
                const parsedPossibleRoutes = possibleRoutes.map((response) => {
                    const parsedResponse = duffelNewParser(response, duffelFirewall, duffelCommission);
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

            const normalizedResponse = normalizeResponse(temp, commission)
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