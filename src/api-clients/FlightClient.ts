import { AirlineProvider, MiniOffer, NewMultiCitySearchParams, Offer, PassengerType, Slice } from "../../types/flightTypes";
import { prisma } from "../prismaClient";
import { combineAllRoutes, combineDiscountedRoundTripRoutes, combineIteneries, duffelDiscountedRoundTripParser, duffelMulticityResponseFormatter, duffelResponseParser, filterResponse, filterRoutes, getAirlineCodes, getDetailedRoundTripRoutes, getPossibleRoutes, getRoundTripRouteOptions, getRouteOptions, getSearchManagementRoutes, mapCombinedResponseToOfferType, mapDiscountedRoundTripOffers, newNormalizeResponse, normalizeMultiResponse, normalizeResponse, parseMulticityKiuResponse, sortMultiCityResponse, sortResponse } from "../utils/flights";
import { combineKiuRoutes } from "../utils/kiu";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";
import KiuClient, { KiuClientInstance } from "./KiuClient";
import { getOffer } from "../services/OfferService";
import { cacheAirlineDetails, cacheResponseInChunks, checkIfSelfTransferRoundTrip, getCachedAirlineDetails, getCachedResponse, getNextDay, getPassengerArrays } from "../utils/utils";
import { CreateOrderPassenger } from "@duffel/api/types";
import { getCachedAmadeusOffer } from "../services/caching.service";
import { v4 as uuidv4 } from 'uuid';
import { DuffelMulticityBookingParams, getCustomFarePrice, ManualLayoverSearchParams } from "../../types/types";
import { BookingRequestParams, PriceFlightSegment } from "../../types/kiuTypes";
import { kiuClasses } from "../../constants/cabinClass";
import HttpError from "../utils/httperror";
import { cacheOffer } from "../utils/cachingHelper";

class FlightClient {
    private duffelClient: DuffelClientInstance
    private amadeusClient: AmadeusClientInstance
    private kiuClient: KiuClientInstance

    constructor({ duffelClient, amadeusClient, kiuClient }: { duffelClient: DuffelClientInstance, amadeusClient: AmadeusClientInstance, kiuClient: KiuClientInstance }) {
        this.duffelClient = duffelClient;
        this.amadeusClient = amadeusClient;
        this.kiuClient = kiuClient;
    }

    static async create() {
        try {
            const duffelClient = await DuffelClient.create();
            const amadeusClient = await AmadeusClient.create();
            const kiuClient = await KiuClient.create();

            return new FlightClient({ duffelClient, amadeusClient, kiuClient });
        } catch (error) {
            throw error;
        }
    }

    async searchFlights({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters, limit=20, offset=0, nextProcessingOffset=0 }: NewMultiCitySearchParams) {
        try {
            const id = JSON.stringify({
                FlightDetails, cabinClass
            });
            const [firewall, commission] = await Promise.all([
                prisma.firewall.findMany({}),
                prisma.commissionManagement.findMany(),
            ])

            // Check if we have cached data first
            const cachedResponse = await getCachedResponse(id, 1, 0);
            if (cachedResponse) {
                const response = await combineIteneries(cachedResponse, 60);
                // Process cached response with while loop logic
                const airlinesDetails = await getCachedAirlineDetails(id);
                const {flightData, processingOffset, searchKey} = await this.processOffersWithWhileLoop(id, response, filters, firewall, sortBy, limit, offset, nextProcessingOffset || 0, airlinesDetails.airlines);
                return {flightData, processingOffset, searchKey, airlinesDetails};
            }

            const isSelfTransferRoundTrip = await checkIfSelfTransferRoundTrip(FlightDetails);
            if (isSelfTransferRoundTrip) {
                const { response, airlines, extendedData } = await this.selfTransferRoundTripSearch({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters });
                const airlinesDetails = { airlines, extendedData }
                const idSet = new Set();
                const dataWithId = response.map((response) => {
                    let id = uuidv4();
                    while (true) {
                        if (idSet.has(id)) {
                            id = uuidv4();
                        }
                        else {
                            idSet.add(id);
                            break;
                        }
                    }
                    return { ...response, id };
                })

                // const savedData = saveSearchResponses(dataWithId, passengers, "ONEWAY");
                cacheResponseInChunks(id, dataWithId);
                cacheAirlineDetails(id, airlinesDetails);

                let chunkSize = 10;
                let filterOffset = 0;
                let filteredResponse = [];

                while (filteredResponse.length < limit && filterOffset < dataWithId.length) {
                    const filteredChunk = filterResponse(dataWithId.slice(filterOffset, filterOffset + chunkSize), filters, firewall, airlinesDetails.airlines)
                    filteredResponse.push(...filteredChunk);
                    filterOffset += chunkSize;
                }

                const combinedIteneries = await combineIteneries(filteredResponse.slice(0, 10), 0)
                return { flightData: combinedIteneries, airlinesDetails };
            }

            let manualLayoverSearch, multiCityFlightSearch;
            let airlineSet = new Set<string>();
            let extendedDataMap = new Map<string, AirlineProvider>();
            if (FlightDetails.length > 1) {
                [manualLayoverSearch, multiCityFlightSearch] = await Promise.all([
                    Promise.all(FlightDetails.map(async (flightDetail) => {
                        const {response, airlines, extendedData} = await this.manualLayoverSearch({
                            origin: flightDetail.originLocation,
                            destination: flightDetail.destinationLocation,
                            departureDate: flightDetail.departureDate,
                            passengers,
                            cabinClass
                        })
                        airlines.forEach((airline) => {
                            airlineSet.add(airline);
                        });
                        extendedData.forEach((airline) => {
                            extendedDataMap.set(airline.iata_code, airline);
                        });
                        return response;
                    })),
                    await this.newMulticityFlightSearch({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters })
                ])
            }
            else {
                manualLayoverSearch = await Promise.all(FlightDetails.map(async (flightDetail) => {
                    const {response, airlines, extendedData} = await this.manualLayoverSearch({
                        origin: flightDetail.originLocation,
                        destination: flightDetail.destinationLocation,
                        departureDate: flightDetail.departureDate,
                        passengers,
                        cabinClass
                    })
                    airlines.forEach((airline) => {
                        airlineSet.add(airline);
                    });
                    extendedData.forEach((airline) => {
                        extendedDataMap.set(airline.iata_code, airline);
                    });
                    return response;
                }));
            }

            // const combinedIteneries = combineKiuRoutes(manualLayoverSearch, 60 * 6);
            // const normalizedResponse = newNormalizeResponse(combinedIteneries, cabinClass)
            // // let temp = multiCityFlightSearch;
            // let temp = normalizedResponse;
            // if (FlightDetails.length > 1) {
            //     temp = [...normalizedResponse, ...multiCityFlightSearch];
            // }
            // const uniqueResponses = filterRoutes(temp as unknown as MiniOffer[]);
            // const sortedResponse = sortResponse(uniqueResponses, sortBy);
            const airlinesDetails = {
                airlines: Array.from(airlineSet),
                extendedData: Array.from(extendedDataMap.values())
            }
            const idSet = new Set();
            const dataWithId = manualLayoverSearch[0].map((response) => {
                let id = uuidv4();
                while (true) {
                    if (idSet.has(id)) {
                        id = uuidv4();
                    }
                    else {
                        idSet.add(id);
                        break;
                    }
                }
                return { ...response, id };
            })

            // const savedData = saveSearchResponses(dataWithId, passengers, "ONEWAY");
            cacheResponseInChunks(id, dataWithId);
            cacheAirlineDetails(id, airlinesDetails);
            
            let chunkSize = 10;
            let filterOffset = 0;
            let filteredResponse = [];

            while (filteredResponse.length < limit && filterOffset < dataWithId.length) {
                const filteredChunk = filterResponse(dataWithId.slice(filterOffset, filterOffset + chunkSize), filters, firewall, airlinesDetails.airlines)
                filteredResponse.push(...filteredChunk);
                filterOffset += chunkSize;
            }
            
            const combinedIteneries = await combineIteneries(filteredResponse.slice(0, 10), 60);
            // return { flightData: filteredResponse?.filter((_, index) => index < 200), airlinesDetails, searchKey: id };
            return {flightData: combinedIteneries, nextProcessingOffset: 11, airlinesDetails};
        } catch (error) {
            throw error;
        }
    }

    private async processOffersWithWhileLoop(id: string, rawData: any[], filters: any, firewall: any[], sortBy: 'BEST' | 'FAST' | 'CHEAP', limit: number, offset: number, startOffset: number, airlines: string[]) {
        // const airlinesDetails = getAirlineCodes(rawData);
        let currentOffset = startOffset;
        let filteredOffers: any[] = [];
        let hasMoreData = true;
        const chunkSize = 30; // Process 10 offers at a time

        while (filteredOffers.length < limit && hasMoreData) {
            // Get next chunk of data from cache5
            const chunkData = await getCachedResponse(id, chunkSize, currentOffset);
            
            if (!chunkData || chunkData.length === 0) {
                hasMoreData = false;
                break;
            }

            // Apply filters to this chunk
            const filteredChunk = filterResponse(chunkData as any[], filters, firewall, airlines);
            
            // Add filtered offers to our collection
            filteredOffers.push(...filteredChunk);
            
            // Move to next chunk
            currentOffset += chunkSize;
        }
        const combinedData = await combineIteneries(filteredOffers, 60);

        // Sort all filtered offers
        // const sortedResponse = sortResponse(combinedData, sortBy);
        
        // Apply pagination (limit and offset)
        const paginatedResponse = combinedData.filter((_, index) => index < limit);

        return {
            flightData: paginatedResponse,
            searchKey: id,
            processingOffset: currentOffset
        };
    }

    async manualLayoverSearch({ origin, destination, passengers, cabinClass, departureDate }: ManualLayoverSearchParams) {
        try {
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(passengers);
            const { searchManagement, possibleRoutes } = await getRouteOptions({ origin, destination });
            const airlineSet = new Set<string>();
            const extendedDataMap = new Map<string, AirlineProvider>();
            //Duffel Request
            const duffelRequests = possibleRoutes.map((route) => {
                return route.map(async (segment, index) => {
                    if (index > 0) {
                        const data = await Promise.all([
                            this.duffelClient.createOfferRequest({
                                passengers: duffelPassengersArray,
                                cabin_class: cabinClass,
                                max_connections: 2,
                                slices: [
                                    {
                                        origin: segment.origin,
                                        destination: segment.destination,
                                        departure_date: departureDate,
                                        departure_time: null,
                                        arrival_time: null,
                                    }
                                ],
                            }),
                            this.duffelClient.createOfferRequest({
                                passengers: duffelPassengersArray,
                                cabin_class: cabinClass,
                                max_connections: 2,
                                slices: [
                                    {
                                        origin: segment.origin,
                                        destination: segment.destination,
                                        departure_date: getNextDay(departureDate),
                                        departure_time: null,
                                        arrival_time: null,
                                    }
                                ],
                            })
                        ])
                        const parsedData = {
                            ...(data[0].data),
                            offers: [...(data[0].data.offers), ...(data[1].data.offers)]
                        }
                        return { ...data[0], data: parsedData }
                    }
                    return this.duffelClient.createOfferRequest({
                        passengers: duffelPassengersArray,
                        cabin_class: cabinClass,
                        max_connections: 2,
                        slices: [
                            {
                                origin: segment.origin,
                                destination: segment.destination,
                                departure_date: departureDate,
                                departure_time: null,
                                arrival_time: null,
                            }
                        ],
                    })
                })
            })

            const kiuRequests = possibleRoutes.map((route) => {
                return route.map(async (segment, i: number) => {
                    if (i > 0) {
                        const data = await Promise.all([
                            this.kiuClient.newSearchFlights({
                                OriginDestinationOptions: [{
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: departureDate
                                }],
                                CabinClass: cabinClass,
                                Passengers: passengers
                            }),
                            this.kiuClient.newSearchFlights({
                                OriginDestinationOptions: [{
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: getNextDay(departureDate)
                                }],
                                CabinClass: cabinClass,
                                Passengers: passengers
                            })
                        ]);
                        // Handle new return structure from KiuClient and collect airline data
                        const parsedData = [
                            ...(data[0]?.response || []),
                            ...(data[1]?.response || [])
                        ];
                        
                        // Add airlines from both responses to the sets
                        if (data[0]?.airlines) {
                            data[0].airlines.forEach((airline: string) => airlineSet.add(airline));
                        }
                        if (data[1]?.airlines) {
                            data[1].airlines.forEach((airline: string) => airlineSet.add(airline));
                        }
                        if (data[0]?.extendedData) {
                            data[0].extendedData.forEach((airline: AirlineProvider) => {
                                extendedDataMap.set(airline.iata_code, airline);
                            });
                        }
                        if (data[1]?.extendedData) {
                            data[1].extendedData.forEach((airline: AirlineProvider) => {
                                extendedDataMap.set(airline.iata_code, airline);
                            });
                        }
                        
                        return parsedData;
                    }
                    const result = await this.kiuClient.newSearchFlights({
                        OriginDestinationOptions: [{
                            OriginLocation: segment.origin,
                            DestinationLocation: segment.destination,
                            DepartureDate: departureDate
                        }],
                        CabinClass: cabinClass,
                        Passengers: passengers
                    });
                    
                    // Add airlines from single response to the sets
                    if (result?.airlines) {
                        result.airlines.forEach((airline: string) => airlineSet.add(airline));
                    }
                    if (result?.extendedData) {
                        result.extendedData.forEach((airline: AirlineProvider) => {
                            extendedDataMap.set(airline.iata_code, airline);
                        });
                    }
                    
                    // Handle new return structure from KiuClient
                    return result?.response || [];
                })
            })


            const [duffelResponse, parsedKiuResponse] = await Promise.all([
                Promise.all(duffelRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
                Promise.all(kiuRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
            ])

            const parsedDuffelResponse = await Promise.all(
                duffelResponse.map(async (possibleRoutes) => {
                    const parsedPossibleRoutes = await Promise.all(
                        possibleRoutes.map(async (response) => {
                            const {result, airlines, extendedData} = await duffelResponseParser(response);
                            airlines.forEach((airline) => {
                                airlineSet.add(airline);
                            });
                            extendedData.forEach((airline) => {
                                extendedDataMap.set(airline.iata_code, airline);
                            });
                            return result;
                        })
                    );
                    return parsedPossibleRoutes;
                })
            );

            const miniDuffelResponse = await Promise.all(parsedDuffelResponse.map(async (route) => {
                return Promise.all(route.map(async (response) => {
                    return await Promise.all(response.map(async (offer) => {
                        return await cacheOffer(offer as unknown as Offer);
                    }));
                }))
            }))
            const miniKiuResponse = await Promise.all(parsedKiuResponse.map(async (route) => {
                return Promise.all(route.map(async (response) => {
                    return await Promise.all(response.map(async (offer) => {
                        return await cacheOffer(offer as unknown as Offer);
                    }));
                }))
            }))
            
            let combination: any = [];

            possibleRoutes.forEach((route, index) => {
                const duffel = miniDuffelResponse?.[index]
                const kiu = miniKiuResponse?.[index]
                const temp = [];
                route.forEach((data, index2) => {
                    temp.push([
                        ...(duffel?.[index2] || []),
                        ...(kiu?.[index2] || [])
                    ])
                })
                const paired = combineAllRoutes(temp, { maxTime: searchManagement?.[0]?.maxConnectionTime, minTime: searchManagement?.[0]?.minConnectionTime })
                if (paired.length > 0)
                    combination.push(paired)
            })


            let temp: any = []

            combination.forEach((route, index) => {
                // if (index === 0)
                //     return;
                temp.push(...route)
            })

            const normalizedResponse = mapCombinedResponseToOfferType(temp as unknown as MiniOffer[][])
            return {response: normalizedResponse, airlines: Array.from(airlineSet), extendedData: Array.from(extendedDataMap.values())};
        } catch (error) {
            throw error;
        }
    }

    async selfTransferRoundTripSearch({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters }: NewMultiCitySearchParams) {
        try {
            const startTime = Date.now();
            console.log(`[selfTransferRoundTripSearch] Starting at: 0ms`);
            
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(passengers);
            let { searchManagement, possibleRoutes } = await getRouteOptions({ origin: FlightDetails[0].originLocation, destination: FlightDetails[0].destinationLocation });
            possibleRoutes = possibleRoutes.slice(1);
            const departureDate = FlightDetails[0].departureDate;
            const returnDate = FlightDetails[1].departureDate;
            const airlineSet = new Set<string>();
            const extendedDataMap = new Map<string, AirlineProvider>();
            
            
            console.log(`[selfTransferRoundTripSearch] Initial setup completed at: ${Date.now() - startTime}ms`);
            
            const duffelRequests = possibleRoutes.map((route) => {
                return route.map(async (segment, index) => {
                    const data = await Promise.all([
                        // Case 1: departure_date: departureDate, return_date: returnDate
                        this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [
                                {
                                    origin: segment.origin,
                                    destination: segment.destination,
                                    departure_date: departureDate,
                                    departure_time: null,
                                    arrival_time: null,
                                },
                                {
                                    origin: segment.destination,
                                    destination: segment.origin,
                                    departure_date: returnDate,
                                    departure_time: null,
                                    arrival_time: null,
                                }
                            ]
                        }),
                        // Case 2: departure_date: getNextDay(departureDate), return_date: getNextDay(returnDate)
                        segment.origin !== FlightDetails[0].originLocation && segment.destination !== FlightDetails[0].destinationLocation ? 
                        this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [
                                {
                                    origin: segment.origin,
                                    destination: segment.destination,
                                    departure_date: getNextDay(departureDate),
                                    departure_time: null,
                                    arrival_time: null,
                                },
                                {
                                    origin: segment.destination,
                                    destination: segment.origin,
                                    departure_date: getNextDay(returnDate),
                                    departure_time: null,
                                    arrival_time: null,
                                }
                            ]
                        }) : {data: {offers: []}},
                        // Case 3: departure_date: getNextDay(departureDate), return_date: returnDate
                        segment.origin !== FlightDetails[0].originLocation ? 
                        this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [
                                {
                                    origin: segment.origin,
                                    destination: segment.destination,
                                    departure_date: getNextDay(departureDate),
                                    departure_time: null,
                                    arrival_time: null,
                                },
                                {
                                    origin: segment.destination,
                                    destination: segment.origin,
                                    departure_date: returnDate,
                                    departure_time: null,
                                    arrival_time: null,
                                }
                            ]
                        }) : {data: {offers: []}},
                        // Case 4: departure_date: departureDate, return_date: getNextDay(returnDate)
                        segment.destination !== FlightDetails[0].destinationLocation ? this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [
                                {
                                    origin: segment.origin,
                                    destination: segment.destination,
                                    departure_date: departureDate,
                                    departure_time: null,
                                    arrival_time: null,
                                },
                                {
                                    origin: segment.destination,
                                    destination: segment.origin,
                                    departure_date: getNextDay(returnDate),
                                    departure_time: null,
                                    arrival_time: null,
                                }
                            ]
                        }) : {data: {offers: []}},
                    ])
                    const parsedData = {
                        ...(data[0].data),
                        offers: [...(data[0].data.offers), ...(data[1].data.offers), ...(data[2].data.offers), ...(data[3].data.offers)]
                    }
                    return { ...data[0], data: parsedData }
                })
            });
            
            console.log(`[selfTransferRoundTripSearch] Duffel requests built at: ${Date.now() - startTime}ms`);

            const kiuRequests = possibleRoutes.map((route) => {
                return route.map(async (segment, index) => {
                    const data = await Promise.all([
                        // Case 1: departure_date: departureDate, return_date: returnDate
                        this.kiuClient.newSearchFlights({
                            OriginDestinationOptions: [
                                {
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: departureDate
                                },
                                {
                                    OriginLocation: segment.destination,
                                    DestinationLocation: segment.origin,
                                    DepartureDate: returnDate
                                }
                            ],
                            Passengers: passengers,
                            CabinClass: cabinClass,
                        }),
                        // Case 2: departure_date: getNextDay(departureDate), return_date: getNextDay(returnDate)
                        segment.origin !== FlightDetails[0].originLocation && segment.destination !== FlightDetails[0].destinationLocation ? this.kiuClient.newSearchFlights({
                            OriginDestinationOptions: [
                                {
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: getNextDay(departureDate)
                                },
                                {
                                    OriginLocation: segment.destination,
                                    DestinationLocation: segment.origin,
                                    DepartureDate: getNextDay(returnDate)
                                }
                            ],
                            Passengers: passengers,
                            CabinClass: cabinClass,
                        }) : {response: []},
                        // Case 3: departure_date: getNextDay(departureDate), return_date: returnDate
                        segment.origin !== FlightDetails[0].originLocation ? this.kiuClient.newSearchFlights({
                            OriginDestinationOptions: [
                                {
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: getNextDay(departureDate)
                                },
                                {
                                    OriginLocation: segment.destination,
                                    DestinationLocation: segment.origin,
                                    DepartureDate: returnDate
                                }
                            ],
                            Passengers: passengers,
                            CabinClass: cabinClass,
                        }) : {response: []},
                        // Case 4: departure_date: departureDate, return_date: getNextDay(returnDate)
                        segment.destination !== FlightDetails[0].destinationLocation ? this.kiuClient.newSearchFlights({
                            OriginDestinationOptions: [
                                {
                                    OriginLocation: segment.origin,
                                    DestinationLocation: segment.destination,
                                    DepartureDate: departureDate
                                },
                                {
                                    OriginLocation: segment.destination,
                                    DestinationLocation: segment.origin,
                                    DepartureDate: getNextDay(returnDate)
                                }
                            ],
                            Passengers: passengers,
                            CabinClass: cabinClass,
                        }) : {response: []},
                    ]);
                    // Handle new return structure from KiuClient and collect airline data
                    const parsedData = [
                        ...(data[0]?.response || []),
                        ...(data[1]?.response || []),
                        ...(data[2]?.response || []),
                        ...(data[3]?.response || [])
                    ];
                    
                    // Add airlines from all 4 responses to the sets
                    data.forEach((response, idx) => {
                        if (response?.airlines) {
                            response.airlines.forEach((airline: string) => airlineSet.add(airline));
                        }
                        if (response?.extendedData) {
                            response.extendedData.forEach((airline: AirlineProvider) => {
                                extendedDataMap.set(airline.iata_code, airline);
                            });
                        }
                    });
                    
                    return parsedData;
                })
            })
            
            console.log(`[selfTransferRoundTripSearch] KIU requests built at: ${Date.now() - startTime}ms`);

            const [duffelResponse, parsedKiuResponse, commissions] = await Promise.all([

                Promise.all(duffelRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
                Promise.all(kiuRequests.map(async (request) => {
                    const result = await Promise.all(request);
                    return result;
                })),
                prisma.commissionManagement.findMany({
                    where: {
                        supplier: {
                            in: ["DUFFEL", "ALL"]
                        },
                        type: "AIRLINE"
                    }
                })
            ])
            
            console.log(`[selfTransferRoundTripSearch] API requests executed at: ${Date.now() - startTime}ms`);

            const parsedDuffelResponse = duffelResponse.map((possibleRoutes, routeIndex) => {
                console.log(`[selfTransferRoundTripSearch] Processing route ${routeIndex + 1}/${duffelResponse.length} at: ${Date.now() - startTime}ms`);
                return possibleRoutes.map((response, segmentIndex) => {
                    console.log(`[selfTransferRoundTripSearch] Processing segment ${segmentIndex + 1}/${possibleRoutes.length} with ${response?.data?.offers?.length || 0} offers at: ${Date.now() - startTime}ms`);
                    const parseStart = Date.now();
                    const {result, airlines, extendedData} = duffelDiscountedRoundTripParser(response, commissions);
                    console.log(`[selfTransferRoundTripSearch] Parser took ${Date.now() - parseStart}ms for segment ${segmentIndex + 1} at: ${Date.now() - startTime}ms`);
                    airlines.forEach((airline) => {
                        airlineSet.add(airline);
                    });
                    extendedData.forEach((airline) => {
                        extendedDataMap.set(airline.iata_code, airline);
                    });
                    return result;
                });
            });
            
            console.log(`[selfTransferRoundTripSearch] Duffel response parsing completed at: ${Date.now() - startTime}ms`);

            const miniDuffelResponse = await Promise.all(parsedDuffelResponse.map(async (route) => {
                return Promise.all(route.map(async (response) => {
                    return await Promise.all(response.map(async (offer) => {
                        return await cacheOffer(offer as unknown as Offer);
                    }));
                }))
            }))
            const miniKiuResponse = await Promise.all(parsedKiuResponse.map(async (route) => {
                return Promise.all(route.map(async (response) => {
                    return await Promise.all(response.map(async (offer) => {
                        return await cacheOffer(offer as unknown as Offer);
                    }));
                }))
            }))
            
            console.log(`[selfTransferRoundTripSearch] Offer caching completed at: ${Date.now() - startTime}ms`);

            let combination: any = [];
            possibleRoutes.forEach((route, index) => {
                const duffel = miniDuffelResponse?.[index]
                const kiu = miniKiuResponse?.[index]
                const temp = [];
                route.forEach((data, index2) => {
                    temp.push([
                        ...(duffel?.[index2] || []),
                        ...(kiu?.[index2] || [])
                    ])
                })
                const paired = combineDiscountedRoundTripRoutes(temp, { maxConnectionTime: searchManagement?.[0]?.maxConnectionTime, minConnectionTime: searchManagement?.[0]?.minConnectionTime })
                if (paired.length > 0)
                    combination.push(paired)
            })


            let temp: any = []

            combination.forEach((route, index) => {
                // if (index === 0)
                //     return;
                temp.push(...route)
            })
            
            console.log(`[selfTransferRoundTripSearch] Route combination completed at: ${Date.now() - startTime}ms`);
            
            const normalizedResponse = mapDiscountedRoundTripOffers(temp as unknown as MiniOffer[][])
            
            console.log(`[selfTransferRoundTripSearch] Final normalization completed at: ${Date.now() - startTime}ms`);
            console.log(`[selfTransferRoundTripSearch] Successfully completed in: ${Date.now() - startTime}ms`);
            
            return {response: normalizedResponse, airlines: Array.from(airlineSet), extendedData: Array.from(extendedDataMap.values())};
        } catch (error) {
            console.error('Error in self transfer round trip search:', error);
            throw error;
        }
    }

    async newMulticityFlightSearch({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters }: NewMultiCitySearchParams) {
        try {
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(passengers);
            const airlineSet = new Set<string>();
            const extendedDataMap = new Map<string, AirlineProvider>();
            const duffelRequest = this.duffelClient.createOfferRequest({
                passengers: duffelPassengersArray,
                cabin_class: cabinClass,
                max_connections: 2,
                slices: FlightDetails.map((flightLeg) => {
                    return {
                        origin: flightLeg.originLocation,
                        destination: flightLeg.destinationLocation,
                        departure_date: flightLeg.departureDate,
                        departure_time: null,
                        arrival_time: null,
                    }
                }),
            })
            let OriginDestionationIds: number[] = [];
            const kiuRequest = this.kiuClient.newSearchFlights({
                Passengers: passengers,
                CabinClass: cabinClass,
                OriginDestinationOptions: FlightDetails.map((flightLeg) => {
                    return {
                        OriginLocation: flightLeg.originLocation,
                        DestinationLocation: flightLeg.destinationLocation,
                        DepartureDate: flightLeg.departureDate,
                    }
                }),

            })
            const [{response: kiuResponse, airlines: kiuAirlines, extendedData: kiuExtendedData}, duffelResponse] = await Promise.all([
                kiuRequest,
                duffelRequest
            ]);
            kiuAirlines.forEach((airline) => {
                airlineSet.add(airline);
            });
            kiuExtendedData.forEach((airline) => {
                extendedDataMap.set(airline.iata_code, airline);
            });

            const {result, airlines, extendedData} = await duffelMulticityResponseFormatter(duffelResponse);
            airlines.forEach((airline) => {
                airlineSet.add(airline);
            });
            extendedData.forEach((airline) => {
                extendedDataMap.set(airline.iata_code, airline);
            });

            return {response: [...kiuResponse, ...result], airlines: Array.from(airlineSet), extendedData: Array.from(extendedDataMap.values())}; //Add Amadeus Response

        } catch (error) {
            throw error;
        }
    }


    async bookKiuFlight(slice: Slice, passengers: PassengerType[], fareCode: string, kiuPassengers) {
        try {
            const response = await this.kiuClient.bookFlight({
                kiuPassengers,
                slices: [slice],
                passengers,
                choices: [fareCode]
            });
            const bookingReference = response?.KIU_AirBookV2RS?.BookingReferenceID?.[0];
            const pnr = bookingReference?.$?.ID || "Not Available";
            console.log("Booking Reference: ");
            console.log(bookingReference);
            if (bookingReference?.KIU_AirPriceRS?.Error) {
                console.log("Error in kiu pnr:");
                console.log(bookingReference?.KIU_AirPriceRS?.Error);
            }
            return pnr;
        } catch (error) {
            console.log("KIU Booking Error: ", error);
            throw (error);
        }
    }

    async bookAmadeusFlight(gdsOfferId: string, passengers: PassengerType[]) {
        try {
            const amadeusOffer = await getCachedAmadeusOffer(gdsOfferId)

            const passengersData = passengers.map((passenger, index) => {
                let returnValue = {
                    id: index + 1,
                    dateOfBirth: passenger.dob,
                    name: {
                        firstName: passenger.firstName,
                        lastName: passenger.lastName,
                    },
                    gender: passenger.gender === 'm' ? 'MALE' : 'FEMALE',
                    contact: {
                        emailAddress: passenger.email,
                        phones: [
                            {
                                deviceType: "MOBILE",
                                countryCallingCode: passenger.phoneNumber.slice(1, passenger.phoneNumber.length - 10),
                                number: passenger.phoneNumber.slice(passenger.phoneNumber.length - 10),
                            },
                        ],
                    },
                    documents: [
                        {
                            documentType: "PASSPORT",
                            birthPlace: passenger.nationality,
                            issuanceLocation: passenger.issuingCountry,
                            issuanceDate: "2015-04-14",
                            number: passenger.passportNumber,
                            expiryDate: passenger.passportExpiryDate,
                            issuanceCountry: passenger.issuingCountry,
                            validityCountry: passenger.issuingCountry,
                            nationality: passenger.issuingCountry,
                            holder: true,
                        },
                    ],
                }
                return returnValue
            })
            const response = await this.amadeusClient.bookingFlight(amadeusOffer, passengersData)
            const PNR = response?.result?.data?.associatedRecords?.filter((record) => record.originSystemCode === 'GDS')?.[0]?.reference;
            return PNR;
        } catch (error) {
            throw error;
        }
    }

    async bookDuffelFlight(slice: Slice, passengers: PassengerType[], sliceIndex: number, choice: { offerId: string, holdOrder: boolean }) {
        try {
            const services = [];
            let totalAmount = parseFloat(slice.sliceAmount);

            const passengersData = passengers.map((passenger, index) => {
                let returnValue: CreateOrderPassenger = {
                    identity_documents: [{
                        type: 'passport',
                        unique_identifier: passenger.passportNumber,
                        issuing_country_code: passenger.issuingCountry,
                        expires_on: passenger.passportExpiryDate
                    }],
                    email: passenger.email,
                    phone_number: passenger.phoneNumber,
                    // type: passenger.type,
                    id: slice.passengers[index].id,
                    born_on: passenger.dob,
                    family_name: passenger.lastName,
                    given_name: passenger.firstName,
                    gender: passenger.gender,
                    title: passenger.title,
                }
                if (passenger.infant_passenger_id) {
                    returnValue.infant_passenger_id = passenger.infant_passenger_id;
                }
                if (passenger.baggageDetails) {
                    passenger?.baggageDetails.forEach((baggageData) => {
                        services.push({
                            id: baggageData.serviceIds[sliceIndex],
                            quantity: baggageData.quantity
                        })
                        totalAmount += baggageData.prices[sliceIndex];
                    })
                }
                return returnValue
            })
            const response = await this.duffelClient.createOrder({
                passengers: passengersData,
                offerId: choice.offerId,
                holdOrder: choice.holdOrder,
                services,
                totalAmount: ("" + totalAmount.toFixed(2)),
            })
            return response.data.booking_reference;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async getCustomFarePrice({ fareOptionGDS, offerId, choices, passengers }: getCustomFarePrice) {
        try {
            if (fareOptionGDS !== "KIU") {
                throw new HttpError("Invalid GDS option", 400);
            }
            const offer = await getOffer(offerId);
            const originDestinationOptions = offer.data.slices.map((slice, sliceIndex) => {
                const FlightSegments = slice.segments.map((segment): PriceFlightSegment => {
                    const flightSegment: PriceFlightSegment = {
                        OriginLocation: segment.origin.iata_code,
                        DestinationLocation: segment.destination.iata_code,
                        DepartureDateTime: segment.departing_at,
                        ArrivalDateTime: segment.arriving_at,
                        CabinType: offer.data.cabinClass,
                        FlightNumber: segment.marketing_carrier_flight_number,
                        MarketingAirline: segment.marketing_carrier.iata_code,
                        ResBookDesigCode: choices[sliceIndex],
                        RPH: kiuClasses?.[`${offer.data.cabinClass}`]

                    }
                    return flightSegment;
                });
                return {
                    FlightSegments: FlightSegments
                }
            });
            const priceResponse = await this.kiuClient.newSearchPrice({
                OriginDestinationOptions: originDestinationOptions,
                Passengers: passengers
            })
            return priceResponse
        } catch (error) {
            throw error;
        }
    }

    async newBookKiuFlight({ slices, kiuPassengers, choices, passengers }: BookingRequestParams) {
        const response = await this.kiuClient.bookFlight({
            slices,
            choices,
            passengers,
            kiuPassengers
        });
        return response;
    }

    async duffelMulticityBooking({ offerId, offer, passengers, totalAmount, holdOrder }: DuffelMulticityBookingParams) {
        const services = [];
        const offerPassengers = offer.passengers.map((passenger) => {
            return {
                ...passenger,
                used: false,
            }
        });
        const passengersData = passengers.map((passenger, index) => {
            let returnValue: CreateOrderPassenger = {
                identity_documents: [{
                    type: 'passport',
                    unique_identifier: passenger.passportNumber,
                    issuing_country_code: passenger.issuingCountry,
                    expires_on: passenger.passportExpiryDate
                }],
                email: passenger.email,
                phone_number: passenger.phoneNumber,
                // type: passenger.type,
                id: offerPassengers.filter((p) => {
                    if (p.type === passenger.type && !p.used) {
                        p.used = true;
                        return true;
                    }
                    return false;
                })[0].id,
                born_on: passenger.dob,
                family_name: passenger.lastName,
                given_name: passenger.firstName,
                gender: passenger.gender,
                title: passenger.title,
            }
            if (passenger.infant_passenger_id) {
                returnValue.infant_passenger_id = passenger.infant_passenger_id;
            }
            if (passenger.baggageDetails) {
                passenger?.baggageDetails.forEach((baggageData) => {
                    services.push({
                        id: baggageData.serviceIds[0],
                        quantity: baggageData.quantity
                    })
                    totalAmount += baggageData.prices[0];
                })
            }
            return returnValue
        })
        const response = await this.duffelClient.createOrder({
            offerId, passengers: passengersData, services, totalAmount, holdOrder
        });
        return response;
    }

}

export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;