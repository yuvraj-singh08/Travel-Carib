import { FlightSupplier } from "@prisma/client";
import { AirlineProvider, FlightOfferSearchParams, MultiCitySearchParams, NewMultiCitySearchParams, Offer, PassengerType, Slice } from "../../types/flightTypes";
import { prisma } from "../prismaClient";
import { amadeusNewParser, combineAllRoutes, combineMultiCityRoutes, duffelMulticityResponseFormatter, duffelNewParser, duffelResponseParser, filterResponse, filterRoutes, getAirlineCodes, getPossibleRoutes, getRouteOptions, getSearchManagementRoutes, mapCombinedResponseToOfferType, newNormalizeResponse, normalizeMultiResponse, normalizeResponse, parseMulticityKiuResponse, sortMultiCityResponse, sortResponse } from "../utils/flights";
import { combineKiuRoutes } from "../utils/kiu";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";
import KiuClient, { KiuClientInstance } from "./KiuClient";
import { getOffer, saveData, saveSearchResponses } from "../services/OfferService";
import { cacheResponseInChunks, getCachedResponse, getNextDay, getPassengerArrays, mergeOffers } from "../utils/utils";
import { CreateOrderPassenger } from "@duffel/api/types";
import { getCachedAmadeusOffer } from "../services/caching.service";
import { v4 as uuidv4 } from 'uuid';
import redis from "../../config/redis";
import { DuffelMulticityBookingParams, getCustomFarePrice, ManualLayoverSearchParams } from "../../types/types";
import { BookingRequestParams, PriceFlightSegment } from "../../types/kiuTypes";
import { kiuClasses } from "../../constants/cabinClass";
import HttpError from "../utils/httperror";

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

    async searchFlights({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters }: NewMultiCitySearchParams) {
    try {
        const id = JSON.stringify({
            FlightDetails, cabinClass
        });
        
        const [firewall, commission] = await Promise.all([
            prisma.firewall.findMany({}),
            prisma.commissionManagement.findMany(),
        ]);

        // Check cache first
        const cachedResponse = await getCachedResponse(id);
        if (cachedResponse) {
            const airlinesDetails = getAirlineCodes(cachedResponse);
            const filteredResponse = filterResponse(cachedResponse, filters, firewall, airlinesDetails.airlines);
            const sortedResponse = sortResponse(filteredResponse, sortBy);
            return { 
                flightData: sortedResponse.slice(0, 200), 
                airlinesDetails, 
                searchKey: id 
            };
        }

        // Process searches with streaming approach
        const searchResults = await this.processSearchesWithStreaming(FlightDetails, passengers, cabinClass);
        
        // Process results in batches to avoid memory buildup
        const finalResults = await this.processBatchedResults(searchResults, sortBy, filters, firewall, passengers);
        
        // Cache results in chunks
        await cacheResponseInChunks(id, finalResults);
        
        const airlinesDetails = getAirlineCodes(finalResults.slice(0, 1000)); // Only process subset for airline codes
        const filteredResponse = filterResponse(finalResults, filters, firewall, airlinesDetails.airlines);
        
        return { 
            flightData: filteredResponse.slice(0, 200), 
            airlinesDetails, 
            searchKey: id 
        };
        
    } catch (error) {
        throw error;
    }
}

// New streaming approach for search processing
async processSearchesWithStreaming(FlightDetails, passengers, cabinClass) {
    const BATCH_SIZE = 100; // Process routes in smaller batches
    const results = [];
    
    if (FlightDetails.length > 1) {
        // Process multi-city searches in parallel but with controlled concurrency
        const [manualResults, multiCityResults] = await Promise.all([
            this.processManualLayoverBatched(FlightDetails, passengers, cabinClass, BATCH_SIZE),
            this.newMulticityFlightSearch({ FlightDetails, passengers, cabinClass, sortBy: "CHEAP", maxLayovers: 10 })
        ]);
        
        // Use generator to avoid creating large intermediate arrays
        const combinedGenerator = this.combineResultsGenerator(manualResults, multiCityResults);
        
        // Process in chunks instead of loading everything into memory
        for await (const batch of this.batchGenerator(combinedGenerator, BATCH_SIZE)) {
            results.push(...batch);
            
            // Periodically trigger garbage collection for large datasets
            if (results.length % (BATCH_SIZE * 10) === 0) {
                if (global.gc) global.gc();
            }
        }
    } else {
        const manualResults = await this.processManualLayoverBatched(FlightDetails, passengers, cabinClass, BATCH_SIZE);
        results.push(...manualResults);
    }
    
    return results;
}

// Batched processing for manual layover search
async processManualLayoverBatched(FlightDetails, passengers, cabinClass, batchSize) {
    const results = [];
    
    for (let i = 0; i < FlightDetails.length; i += batchSize) {
        const batch = FlightDetails.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
            batch.map(flightDetail => 
                this.manualLayoverSearchOptimized({
                    origin: flightDetail.originLocation,
                    destination: flightDetail.destinationLocation,
                    departureDate: flightDetail.departureDate,
                    passengers,
                    cabinClass
                })
            )
        );
        
        // Process batch results immediately instead of accumulating
        const combinedBatch = this.combineKiuRoutesOptimized(batchResults, 60 * 6);
        const normalizedBatch = newNormalizeResponse(combinedBatch, cabinClass);
        
        results.push(...normalizedBatch);
        
        // Clear batch from memory
        batchResults.length = 0;
    }
    
    return results;
}

// Memory-optimized version of manualLayoverSearch
async manualLayoverSearchOptimized({ origin, destination, passengers, cabinClass, departureDate }) {
    try {
        const { duffelPassengersArray } = getPassengerArrays(passengers);
        const { searchManagement, possibleRoutes } = await getRouteOptions({ origin, destination });
        
        // Process routes in smaller batches to reduce memory pressure
        const ROUTE_BATCH_SIZE = 5;
        const allCombinations = [];
        
        for (let i = 0; i < possibleRoutes.length; i += ROUTE_BATCH_SIZE) {
            const routeBatch = possibleRoutes.slice(i, i + ROUTE_BATCH_SIZE);
            
            const [duffelBatch, kiuBatch] = await Promise.all([
                this.processDuffelBatch(routeBatch, duffelPassengersArray, cabinClass, departureDate),
                this.processKiuBatch(routeBatch, passengers, cabinClass, departureDate)
            ]);
            
            // Process combinations immediately for this batch
            routeBatch.forEach((route, batchIndex) => {
                const duffel = duffelBatch[batchIndex];
                const kiu = kiuBatch[batchIndex];
                const temp = [];
                
                route.forEach((data, segmentIndex) => {
                    temp.push([
                        ...(duffel?.[segmentIndex] || []),
                        ...(kiu?.[segmentIndex] || [])
                    ]);
                });
                
                const paired = combineAllRoutes(temp, { 
                    maxTime: searchManagement?.[0]?.maxConnectionTime, 
                    minTime: searchManagement?.[0]?.minConnectionTime 
                });
                
                if (paired.length > 0) {
                    allCombinations.push(...paired);
                }
            });
            
            // Clear batch data
            duffelBatch.length = 0;
            kiuBatch.length = 0;
        }
        
        return mapCombinedResponseToOfferType(allCombinations);
        
    } catch (error) {
        throw error;
    }
}

// Generator function to combine results without creating large arrays
*combineResultsGenerator(manualResults, multiCityResults = []) {
    for (const result of manualResults) {
        yield result;
    }
    for (const result of multiCityResults) {
        yield result;
    }
}

// Async generator for batch processing
async *batchGenerator(generator, batchSize) {
    let batch = [];
    
    for (const item of generator) {
        batch.push(item);
        
        if (batch.length >= batchSize) {
            yield batch;
            batch = []; // Clear the batch
        }
    }
    
    // Yield remaining items
    if (batch.length > 0) {
        yield batch;
    }
}

// Optimized batch processing for final results
async processBatchedResults(searchResults, sortBy, filters, firewall, passengers) {
    const PROCESSING_BATCH_SIZE = 1000;
    const uniqueResponses = [];
    const idSet = new Set();
    
    // Process in chunks to avoid memory buildup
    for (let i = 0; i < searchResults.length; i += PROCESSING_BATCH_SIZE) {
        const chunk = searchResults.slice(i, i + PROCESSING_BATCH_SIZE);
        
        // Filter routes in this chunk
        const filtered = filterRoutes(chunk);
        
        // Add IDs and check uniqueness
        const chunkWithIds = filtered.map(response => {
            let id = uuidv4();
            while (idSet.has(id)) {
                id = uuidv4();
            }
            idSet.add(id);
            return { ...response, id };
        });
        
        uniqueResponses.push(...chunkWithIds);
        
        // Clear processed chunk
        chunk.length = 0;
        
        // Trigger GC periodically for large datasets
        if (i % (PROCESSING_BATCH_SIZE * 5) === 0 && global.gc) {
            global.gc();
        }
    }
    
    // Sort only once at the end
    const sortedResponse = sortResponse(uniqueResponses, sortBy);
    
    // Save search responses (consider doing this asynchronously)
    setImmediate(() => {
        saveSearchResponses(sortedResponse, passengers, "ONEWAY");
    });
    
    return sortedResponse;
}

// Optimized KIU routes combination
combineKiuRoutesOptimized(routes, maxTime) {
    // Use a more memory-efficient approach
    const results = [];
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < routes.length; i += BATCH_SIZE) {
        const batch = routes.slice(i, i + BATCH_SIZE);
        const batchResults = combineKiuRoutes(batch, maxTime);
        results.push(...batchResults);
        
        // Clear batch
        batch.length = 0;
    }
    
    return results;
}

// Process Duffel requests in batches
async processDuffelBatch(routeBatch, duffelPassengersArray, cabinClass, departureDate) {
    const CONCURRENT_LIMIT = 3; // Limit concurrent requests
    const results = [];
    
    for (let i = 0; i < routeBatch.length; i += CONCURRENT_LIMIT) {
        const concurrentBatch = routeBatch.slice(i, i + CONCURRENT_LIMIT);
        
        const batchPromises = concurrentBatch.map(route => 
            Promise.all(route.map(async (segment, index) => {
                if (index > 0) {
                    const [today, tomorrow] = await Promise.all([
                        this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [{
                                origin: segment.origin,
                                destination: segment.destination,
                                departure_date: departureDate,
                                departure_time: null,
                                arrival_time: null,
                            }],
                        }),
                        this.duffelClient.createOfferRequest({
                            passengers: duffelPassengersArray,
                            cabin_class: cabinClass,
                            max_connections: 2,
                            slices: [{
                                origin: segment.origin,
                                destination: segment.destination,
                                departure_date: getNextDay(departureDate),
                                departure_time: null,
                                arrival_time: null,
                            }],
                        })
                    ]);
                    
                    return {
                        ...today,
                        data: {
                            ...today.data,
                            offers: [...today.data.offers, ...tomorrow.data.offers]
                        }
                    };
                }
                
                return this.duffelClient.createOfferRequest({
                    passengers: duffelPassengersArray,
                    cabin_class: cabinClass,
                    max_connections: 2,
                    slices: [{
                        origin: segment.origin,
                        destination: segment.destination,
                        departure_date: departureDate,
                        departure_time: null,
                        arrival_time: null,
                    }],
                });
            }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Parse results immediately
        const parsedResults = await Promise.all(
            batchResults.map(routeResult => 
                Promise.all(routeResult.map(response => duffelResponseParser(response)))
            )
        );
        
        results.push(...parsedResults);
    }
    
    return results;
}

// Similar optimization for KIU batch processing
async processKiuBatch(routeBatch, passengers, cabinClass, departureDate) {
    const CONCURRENT_LIMIT = 3;
    const results = [];
    
    for (let i = 0; i < routeBatch.length; i += CONCURRENT_LIMIT) {
        const concurrentBatch = routeBatch.slice(i, i + CONCURRENT_LIMIT);
        
        const batchPromises = concurrentBatch.map(route =>
            Promise.all(route.map(async (segment, index) => {
                if (index > 0) {
                    const [today, tomorrow] = await Promise.all([
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
                    
                    return [...today, ...tomorrow];
                }
                
                return this.kiuClient.newSearchFlights({
                    OriginDestinationOptions: [{
                        OriginLocation: segment.origin,
                        DestinationLocation: segment.destination,
                        DepartureDate: departureDate
                    }],
                    CabinClass: cabinClass,
                    Passengers: passengers
                });
            }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }
    
    return results;
}


    async manualLayoverSearch({ origin, destination, passengers, cabinClass, departureDate }: ManualLayoverSearchParams) {
        try {
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(passengers);
            const { searchManagement, possibleRoutes } = await getRouteOptions({ origin, destination });
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
                        const parsedData = [...data[0], ...data[1]];
                        return parsedData;
                    }
                    return this.kiuClient.newSearchFlights({
                        OriginDestinationOptions: [{
                            OriginLocation: segment.origin,
                            DestinationLocation: segment.destination,
                            DepartureDate: departureDate
                        }],
                        CabinClass: cabinClass,
                        Passengers: passengers
                    })
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
                        possibleRoutes.map((response) => {
                            const parsedResponse = duffelResponseParser(response);
                            return parsedResponse;
                        })
                    );
                    return parsedPossibleRoutes;
                })
            );

            let combination: any = [];

            possibleRoutes.forEach((route, index) => {
                const duffel = parsedDuffelResponse?.[index]
                const kiu = parsedKiuResponse?.[index]
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

            const normalizedResponse = mapCombinedResponseToOfferType(temp)
            return normalizedResponse;
        } catch (error) {
            throw error;
        }
    }

    async newMulticityFlightSearch({ FlightDetails, sortBy, maxLayovers, passengers, cabinClass, filters }: NewMultiCitySearchParams) {
        try {
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(passengers);
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
            const [kiuResponse, duffelResponse] = await Promise.all([
                kiuRequest,
                duffelRequest
            ]);
            const parsedDuffelResponse = await duffelMulticityResponseFormatter(duffelResponse);

            return [...kiuResponse, ...parsedDuffelResponse]; //Add Amadeus Response

        } catch (error) {
            throw error;
        }
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
        const airlines = [];
        const extendedData: AirlineProvider[] = [];

        const response = await Promise.all(requests);
        const parsedResponse = response.map(res => {
            res.airlinesDetails.airlines.forEach((airline, index) => {
                if (!airlines.includes(airline)) {
                    airlines.push(airline)
                    extendedData.push(res.airlinesDetails.extendedData[index])
                }
            })
            return res.flightData;
        });

        const combinedRoutes = combineMultiCityRoutes(parsedResponse);
        const normalizedResponse = normalizeMultiResponse(combinedRoutes, params.cabinClass);
        const sortedResponse = sortMultiCityResponse(normalizedResponse, params.sortBy);
        const result = sortedResponse.filter((route, index) => {
            if (index < 30) {
                return true;
            }
            return false;
        })
        const savedResult = await saveData(result, params.passengers, params.flightWay)

        return { flightData: savedResult, airlinesDetails: { airlines, extendedData } };
    }

    async advanceFlightSearch(params: FlightOfferSearchParams) {
        try {
            const { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray } = getPassengerArrays(params.passengers);
            //Calculating Possible Routes
            const [firewall, commission] = await Promise.all([
                prisma.firewall.findMany({}),
                prisma.commissionManagement.findMany(),
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
                let routeId = params.originLocation + params.destinationLocation;
                kiuFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId === id && (!firewall.code && !firewall.flightSequence)) {
                        flag = false;
                    }
                })
                return flag
            })
            const amaduesPossibleRoutes = possibleRoutes.filter((route) => {
                let flag = true;
                let routeId = params.originLocation + params.destinationLocation;
                amadeusFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId === id && (!firewall.code && !firewall.flightSequence)) {
                        flag = false;
                    }
                })
                return flag
            })
            const duffelPossibleRoutes = possibleRoutes.filter((route) => {
                let flag = true;
                let routeId = params.originLocation + params.destinationLocation;
                duffelFirewall.forEach((firewall) => {
                    const id = firewall.from + firewall.to;
                    if (id !== '' && routeId === id && (!firewall.code && !firewall.flightSequence)) {
                        flag = false;
                    }
                })
                return flag
            })
            console.log(possibleRoutes);



            //Duffel Request
            const duffelRequests = duffelPossibleRoutes.map((route) => {
                return route.map(async (segment, index) => {
                    if (index > 0) {
                        const data = await Promise.all([
                            this.duffelClient.createOfferRequest({
                                passengers: duffelPassengersArray,
                                cabin_class: params.cabinClass,
                                max_connections: 2,
                                slices: [
                                    {
                                        origin: segment.origin,
                                        destination: segment.destination,
                                        departure_date: params.departureDate,
                                        departure_time: null,
                                        arrival_time: null,
                                    }
                                ],
                            }),
                            this.duffelClient.createOfferRequest({
                                passengers: duffelPassengersArray,
                                cabin_class: params.cabinClass,
                                max_connections: 2,
                                slices: [
                                    {
                                        origin: segment.origin,
                                        destination: segment.destination,
                                        departure_date: getNextDay(params.departureDate),
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
                        cabin_class: params.cabinClass,
                        max_connections: 2,
                        slices: [
                            {
                                origin: segment.origin,
                                destination: segment.destination,
                                departure_date: params.departureDate,
                                departure_time: null,
                                arrival_time: null,

                            }
                        ],
                    })
                })
            })

            //Kiu Request
            const kiuRequests = kiuPossibleRoutes.map((route) => {
                return route.map(async (segment, i: number) => {
                    if (i > 0) {
                        const data = await Promise.all([
                            this.kiuClient.searchFlights({
                                DepartureDate: params.departureDate,
                                OriginLocation: segment.origin,
                                DestinationLocation: segment.destination,
                                Passengers: params.passengers,
                                CabinClass: params.cabinClass,
                                tripOrigin: params.originLocation,
                                tripDestination: params.destinationLocation
                            }, kiuFirewall, kiuCommission),
                            this.kiuClient.searchFlights({
                                DepartureDate: getNextDay(params.departureDate),
                                OriginLocation: segment.origin,
                                DestinationLocation: segment.destination,
                                Passengers: params.passengers,
                                CabinClass: params.cabinClass,
                                tripOrigin: params.originLocation,
                                tripDestination: params.destinationLocation
                            }, kiuFirewall, kiuCommission)
                        ])
                        const parsedData = [...data[0], ...data[1]];
                        return parsedData;
                    }
                    return this.kiuClient.searchFlights({
                        DepartureDate: params.departureDate,
                        OriginLocation: segment.origin,
                        DestinationLocation: segment.destination,
                        Passengers: params.passengers,
                        CabinClass: params.cabinClass,
                        tripOrigin: params.originLocation,
                        tripDestination: params.destinationLocation
                    }, kiuFirewall, kiuCommission)
                })
            })

            let index = 0;
            const amadeusRequests = amaduesPossibleRoutes.map((route) => {
                return route.map(async (segment, i: number) => {
                    if (i > 0) {
                        let data = await Promise.all([
                            this.amadeusClient.searchFlights({
                                departure: (params.departureDate),
                                locationDeparture: segment.origin,
                                locationArrival: segment.destination,
                                adults: params.passengerType,
                                passengers: amadeusPassengersArray,
                                cabinClass: params.cabinClass,
                            }),
                            this.amadeusClient.searchFlights({
                                departure: getNextDay(params.departureDate),
                                locationDeparture: segment.origin,
                                locationArrival: segment.destination,
                                adults: params.passengerType,
                                passengers: amadeusPassengersArray,
                                cabinClass: params.cabinClass,
                            })
                        ]);
                        const parsedData: any = { data: [], dictionaries: {} };
                        data.forEach((singleResponse) => {
                            parsedData.data = [...(parsedData.data), ...(singleResponse.data)];
                            parsedData.dictionaries.aircraft = {
                                ...(parsedData.dictionaries?.aircraft),
                                ...(singleResponse.dictionaries?.aircraft)
                            };
                            parsedData.dictionaries.carriers = {
                                ...(parsedData.dictionaries?.carriers),
                                ...(singleResponse.dictionaries?.carriers)
                            };
                            parsedData.dictionaries.currencies = {
                                ...(parsedData.dictionaries?.currencies),
                                ...(singleResponse.dictionaries?.currencies)
                            };
                            parsedData.dictionaries.locations = {
                                ...(parsedData.dictionaries?.locations),
                                ...(singleResponse.dictionaries?.locations)
                            };
                        })
                        return parsedData
                    }
                    return this.amadeusClient.searchFlights({
                        departure: params.departureDate,
                        locationDeparture: segment.origin,
                        locationArrival: segment.destination,
                        adults: params.passengerType,
                        passengers: amadeusPassengersArray,
                        cabinClass: params.cabinClass,
                    })
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
                    const parsedResponse = amadeusNewParser(response, amadeusFirewall, amadeusCommission, params.originLocation, params.destinationLocation);
                    return parsedResponse;
                })
                return parsedPossibleRoutes
            })

            const parsedDuffelResponse = duffelResponse.map((possibleRoutes) => {
                const parsedPossibleRoutes = possibleRoutes.map((response) => {
                    const parsedResponse = duffelNewParser(response, duffelFirewall, duffelCommission, params.originLocation, params.destinationLocation);
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

            const normalizedResponse = normalizeResponse(temp, commission, params.cabinClass)
            const airlinesDetails = getAirlineCodes(normalizedResponse);
            //@ts-ignore
            const filteredResponse = filterResponse(normalizedResponse, params.filters, allFirewall, airlinesDetails.airlines)
            const sortedResponse = sortResponse(filteredResponse, params.sortBy);
            const savedData = saveSearchResponses(sortedResponse, params.passengers, "ONEWAY");
            // redis.set(`${params.originLocation}-${params.destinationLocation}-${params.departureDate}`, JSON.stringify(savedData));
            const id = uuidv4();
            redis.set(id, JSON.stringify(savedData));
            const result = sortedResponse.filter((route, index) => {
                if (index < 60) {
                    return true;
                }
                return false;
            })
            return { flightData: result, airlinesDetails, searchKey: id };

        } catch (error) {
            throw (error);
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