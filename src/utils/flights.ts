import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import { routesData } from "../../constants/flightRoutes";
import { FilterType, Firewall, Offer, routeType } from "../../types/flightTypes";
import { AmadeusResponseType } from "../../types/amadeusTypes";
import { response } from "express";
import { getDifferenceInMinutes } from "./utils";
import moment from "moment";

export const duffelNewParser = (duffelResponse: DuffelResponse<OfferRequest>) => {
    try {
        const parsedResponse = duffelResponse.data.offers.map((result) => {
            let responseId = "";
            let departing_at = result.slices?.[0]?.segments?.[0]?.departing_at;
            let arriving_at = result.slices?.[0]?.segments?.[result.slices?.[0]?.segments?.length - 1]?.arriving_at;
            result.slices?.[0]?.segments?.forEach((segment) => {
                responseId += segment.operating_carrier.iata_code + segment.operating_carrier_flight_number
            })
            return {
                ...result,
                responseId,
                departing_at,
                arriving_at,
                cabin_class: duffelResponse.data.cabin_class
            }
        })
        return parsedResponse;
    } catch (error) {
        throw error;
    }
}

export const amadeusNewParser = (amadeusResponse: AmadeusResponseType) => {
    try {
        const parsedResponse = amadeusResponse?.data?.map((result) => {
            let responseId = "";
            const segments = result?.itineraries?.[0]?.segments?.map((segment) => {
                responseId += segment?.operating?.carrierCode + segment?.number
                return {
                    departing_at: segment?.departure?.at,
                    arriving_at: segment?.arrival?.at,
                    aircraft: {
                        iata_code: segment?.aircraft?.code,
                        name: amadeusResponse?.dictionaries?.aircraft?.[segment?.aircraft?.code],
                    },
                    operating_carrier_flight_number: segment?.number,
                    marketing_carrier_flight_number: segment?.number,
                    operating_carrier: {
                        iata_code: segment?.operating?.carrierCode,
                        name: amadeusResponse?.dictionaries?.carriers?.[segment?.operating?.carrierCode]
                    },
                    flight_number: segment?.aircraft?.code,
                    destination: {
                        iata_code: segment?.arrival?.iataCode,
                        iata_city_code: amadeusResponse?.dictionaries?.locations?.[segment?.arrival?.iataCode]?.cityCode,
                        iata_country_code: amadeusResponse?.dictionaries?.locations?.[segment?.arrival?.iataCode]?.countryCode
                    },
                    origin: {
                        iata_code: segment?.departure?.iataCode,
                        iata_city_code: amadeusResponse?.dictionaries?.locations?.[segment?.departure?.iataCode]?.cityCode,
                        iata_country_code: amadeusResponse?.dictionaries?.locations?.[segment?.departure?.iataCode]?.countryCode
                    },
                    duration: segment?.duration
                    // departure_airport: segment?.departure?.airport?.code,
                    // arrival_airport: segment?.arrival?.airport?.code,
                }
            })

            const n = result?.itineraries?.[0]?.segments?.length;
            const departing_at = segments?.[0]?.departing_at;
            const arriving_at = segments?.[n - 1]?.arriving_at;

            return {
                responseId,
                total_amount: result?.price?.total,
                slices: [
                    {
                        origin: segments?.[0]?.origin,
                        destination: segments?.[n - 1]?.destination,
                        departing_at,
                        arriving_at,
                        segments: segments
                    }
                ],
            }
        })

        return parsedResponse

    } catch (error) {
        console.log("Error while parsing");
        throw error
    }
}

export const kiuNewPraser = (duffelResponse: DuffelResponse<OfferRequest>) => {
    try {

    } catch (error) {

    }
}

export const parseDuffelResponse = (duffelRespnose: DuffelResponse<OfferRequest>[]) => {
    let parsedResponse = duffelRespnose[0].data.offers
    duffelRespnose.forEach((data, index) => {
        if (index === 0)
            return
        parsedResponse.push(...(data.data.offers))
    })
    parsedResponse = parsedResponse.map((response) => {
        let responseId = ""
        response.slices.forEach((slice) => {
            let sliceId = "";
            slice.segments.forEach((segment) => {
                sliceId += `${segment?.marketing_carrier?.iata_code}${segment?.marketing_carrier_flight_number}`
            })
            responseId += sliceId
        })
        return { ...response, responseId }
    })
    return parsedResponse;
}

export const parseAmadeusResponse = (amadeusResponse: any) => {
    try {
        const response = amadeusResponse[0]?.data || []
        const dictionaries = amadeusResponse[0]?.dictionaries || [];
        amadeusResponse.forEach((data, index) => {
            if (index === 0) {
                return;
            }
            response.push(...(data?.data))
            dictionaries.locations = { ...dictionaries?.locations, ...data?.dictionaries?.locations }
            dictionaries.aircraft = { ...dictionaries?.aircraft, ...data?.dictionaries?.aircraft }
            dictionaries.currencies = { ...dictionaries?.currencies, ...data?.dictionaries?.currencies }
            dictionaries.carriers = { ...dictionaries?.carriers, ...data?.dictionaries?.carriers }
        });

        const parsedResponse = response.map((data, index) => {
            let responseId = ""
            const slices = data.itineraries.map((itinerary) => {
                let sliceId = "";
                const segments = itinerary?.segments?.map((segment) => {
                    sliceId += `${segment?.carrierCode}${segment?.number}`
                    return {
                        origin: {
                            iata_code: segment?.departure?.iataCode,
                            iata_city_code: dictionaries?.locations[segment?.departure?.iataCode]?.cityCode,
                            iata_country_code: dictionaries?.locations[segment?.departure?.iataCode]?.countryCode
                        },
                        destination: {
                            iata_code: segment?.arrival?.iataCode,
                            iata_city_code: dictionaries?.locations[segment?.arrival?.iataCode]?.cityCode,
                            iata_country_code: dictionaries?.locations[segment?.arrival?.iataCode]?.countryCode
                        },
                        departing_at: segment?.departure?.at,
                        arriving_at: segment?.arrival?.at,
                        operating_carrier: {
                            iata_code: segment?.carrierCode,
                            name: dictionaries?.carriers[segment?.operating?.carrierCode] || "NA"
                        },
                        marketing_carrier: {
                            iata_code: segment?.carrierCode
                        },
                        aircraft: {
                            iata_code: segment?.aircraft?.code,
                            name: dictionaries?.aircraft[segment?.aircraft?.code]
                        },
                        operating_carrier_flight_number: segment?.number,
                        duration: segment?.duration
                    }
                })
                responseId += sliceId;
                return {
                    duration: itinerary?.duration,
                    segments: segments,
                }
            })
            return {
                total_amount: data?.price?.total,
                tax_amount: data?.price?.total - data?.price?.base,
                base_currency: data?.price?.currency,
                tax_currency: data?.price?.currency,
                slices: slices,
                responseId: responseId
            }
            //Remaining: PricingOptions, travelerPricing
        })
        return parsedResponse;
    } catch (error) {
        console.log(error);
    }
}

export const filterResponse = (response: Offer[], filters: FilterType) => {
    const filteredResponse: Offer[] = response.filter((route) => {
        const minPriceFilter = filters?.MinPrice ? parseFloat(route.total_amount) >= filters.MinPrice : true
        const maxPriceFilter = filters?.MaxPrice ? parseFloat(route.total_amount) <= filters.MaxPrice : true;

        //Onward Duration
        let MaxOnwardDuration = filters.MaxOnwardDuration ? false : true;
        let MinOnwardDuration = filters.MinOnwardDuration ? false : true;
        if (filters.MaxOnwardDuration) {
            MaxOnwardDuration = true
            route?.slices?.forEach((slice) => {
                slice?.segments?.forEach((segment) => {
                    if (moment.duration(segment.duration).asMinutes() > filters.MaxOnwardDuration) {
                        MaxOnwardDuration = false;
                    }
                })
            })
        }

        if (filters.MinOnwardDuration) {
            MinOnwardDuration = true
            route?.slices?.forEach((slice) => {
                slice?.segments?.forEach((segment) => {
                    if (moment.duration(segment.duration).asMinutes() < filters.MinOnwardDuration) {
                        MinOnwardDuration = false;
                    }
                })
            })
        }

        //Departure and Arrival Time
        const departureTime = new Date(route.departing_at);
        const arrivalTime = new Date(route.arriving_at);
        const departureHour = departureTime.getHours();
        const arrivalHour = arrivalTime.getHours();
        let DepartureFilter = (filters.MaxDepartureTime && filters.MinDepartureTime) ? false : true;
        let ArrivalFilter = (filters.MaxArrivalTime && filters.MinArrivalTime) ? false : true;
        if (filters.MaxDepartureTime && filters.MinDepartureTime) {
            DepartureFilter = (departureHour >= filters.MinDepartureTime && departureHour <= filters.MaxDepartureTime)
        }
        if (filters.MinArrivalTime && filters.MaxArrivalTime) {
            ArrivalFilter = (arrivalHour >= filters.MinArrivalTime && arrivalHour <= filters.MaxArrivalTime)
        }


        //Max Duration
        let maxDuration = filters.MaxDuration ? false : true;
        const departing_at = route?.slices?.[0]?.segments?.[0]?.departing_at;
        const arriving_at = route?.slices?.[route?.slices?.length - 1]?.segments?.[route?.slices?.[route?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
        const timeDiff = getDifferenceInMinutes(departing_at, arriving_at);
        if (filters.MaxDuration && timeDiff / 60 <= filters.MaxDuration) {
            maxDuration = true;
        }

        //Max Stops
        const maxStops = filters.MaxStops ? route.stops <= filters.MaxStops : true

        return minPriceFilter && maxPriceFilter && maxDuration && maxStops && MaxOnwardDuration && MinOnwardDuration && ArrivalFilter && DepartureFilter;
    });

    return filteredResponse;
}

function filterRoutes(routes: Offer[]): Offer[] {
    const uniqueRoutes: Map<string, Offer> = new Map();

    for (const route of routes) {
        const existingRoute = uniqueRoutes.get(route.responseId);
        // If no existing route or the new one is cheaper, update the map
        if (!existingRoute || route.total_amount < existingRoute.total_amount) {
            uniqueRoutes.set(route.responseId, route);
        }
    }

    return Array.from(uniqueRoutes.values());
}

// Function to combine the filtered routes from each leg into full routes
export function combineAllRoutes(routeArrays: Offer[][]): Offer[][] {
    // Start by filtering each route array to eliminate duplicates within each segment
    const filteredRoutesPerSegment: Offer[][] = routeArrays.map(filterRoutes);

    // Initialize with the routes from the first leg (A -> B)
    let result: (Offer)[][] = filteredRoutesPerSegment[0].map(route => [route]);

    // Now combine with each subsequent leg
    for (let i = 1; i < filteredRoutesPerSegment.length; i++) {
        const nextSegmentRoutes = filteredRoutesPerSegment[i];
        const newResult: (Offer)[][] = [];

        for (const currentRoute of result) {
            for (const nextRoute of nextSegmentRoutes) {
                if (nextRoute.total_amount === undefined) {
                    console.log(nextRoute.total_amount);
                }
                // Ensure that the time difference is sufficient between current route and next route
                const lastSegmentOfCurrentRoute = currentRoute[currentRoute.length - 1]?.slices?.[0]?.segments;
                const lastSegmentLength = lastSegmentOfCurrentRoute?.length;
                const differenceInMinutes = getDifferenceInMinutes(
                    lastSegmentOfCurrentRoute?.[lastSegmentLength - 1].departing_at,
                    nextRoute?.slices?.[0]?.segments?.[0]?.departing_at
                );

                // Check the time gap is more than the allowed transfer time
                if (differenceInMinutes > (parseInt(process.env.SELF_TRANSFER_TIME_DIFF || '60'))) {
                    // Sum the total_amount of the currentRoute and nextRoute
                    const totalAmount = currentRoute.reduce((sum, route) => sum + (parseFloat(route.total_amount) || 0), 0) + (parseFloat(nextRoute.total_amount) || 0);

                    // Add the combined route with updated total_amount
                    newResult.push([...currentRoute, { ...nextRoute, total_amount: `${totalAmount}` }]);
                }
            }
        }

        result = newResult;
    }

    return result;
}

// export const pairResponse = (response: any) => {
//     let currentPair: any = [];
//     const pair = response.map((combinedResponse, index) => {
//         if (index > 0 && index >= (response?.length - 1)){
//             return;
//         }
//         if(response.)
//     })
// }

export const normalizeResponse = (response: Offer[][]) => {
    const result = response.map((offer) => {
        let slices = [];
        let stops = 0;
        offer.forEach((route) => {
            slices.push(...(route.slices));
        })
        slices.forEach((slice) => {
            stops += slice?.segments?.length - 1 || 0;
        })
        if (slices?.length > 1) {
            stops += 1
        }
        return {
            origin: slices?.[0]?.origin,
            destination: slices?.[slices.length - 1]?.destination,
            departing_at: slices?.[0]?.departing_at,
            arriving_at: slices?.[slices.length - 1]?.arriving_at,
            stops,
            // duration: offer[0].duration,
            total_amount: offer.reduce((total, route) => total + parseFloat(route.total_amount), 0),
            // base_currency: offer[0].base_currency,
            // tax_currency: offer[0].tax_currency,
            slices
        };
    })
    return result;

}

export const sortResponse = (response: Offer[] | any) => {
    return response.sort((a, b) => { return parseFloat(a.total_amount) - parseFloat(b.total_amount) })
}

export const combineResponses = (responses: any) => {
    const responseMap = new Map();
    const result = [];

    // Iterate through each object in the responses array
    for (const response of responses) {
        const { responseId, total_amount } = response;

        // If the responseId is not in the map, add it with the current object
        if (!responseMap.has(responseId)) {
            responseMap.set(responseId, response);
        } else {
            // If it already exists, compare the prices and keep the one with the lower price
            const existingResponse = responseMap.get(responseId);
            if (total_amount < existingResponse.total_amount) {
                responseMap.set(responseId, response);
            }
        }
    }

    responseMap.forEach((value) => result.push(value));
    result.sort((a, b) => { return a.total_amount - b.total_amount })
    return result;
}

export const getPossibleRoutes = (origin: string, destination: string, maxLayovers: number) => {
    try {
        if (maxLayovers <= 0) {
            return [];
        }
        const originRoutes = routesData.filter((data) => {
            if (data.origin === origin)
                return true;
            return false;
        })
        const destinationRoutes = routesData.filter((data) => {
            if (data.destination === destination)
                return true;
            return false;
        })

        //Pair Origin Routes and Destination Routes
        const possibleRoutes: routeType[][] = [], usedOriginRoutes: routeType[] = [], usedDestinationRoutes: routeType[] = []
        originRoutes.forEach(originRoute => {
            destinationRoutes.forEach(destinationRoute => {
                if (originRoute.destination === destinationRoute.origin) {
                    possibleRoutes.push([originRoute, destinationRoute])

                    //Keep track of used Routes
                    if (!usedOriginRoutes.includes(originRoute))
                        usedOriginRoutes.push(originRoute)
                    if (!usedDestinationRoutes.includes(destinationRoute))
                        usedDestinationRoutes.push(destinationRoute)
                }
            })
        })

        const remainingOriginRoutes = originRoutes.filter((route) => {
            if (!usedOriginRoutes.includes(route))
                return true;
            return false;
        })

        const remainingDestinationRoutes = destinationRoutes.filter((route) => {
            if (!usedDestinationRoutes.includes(route))
                return true;
            return false;
        })

        //Recursively get possible routes for remaining Origin and Destination Routes up to maxLayovers
        let possibleOriginRoutes: routeType[][], possibleDestinationRoutes: routeType[][]
        remainingOriginRoutes.forEach((route) => {
            possibleOriginRoutes = getPossibleRoutes(route.destination, destination, maxLayovers - 1)
            if (possibleDestinationRoutes?.length > 0) {
                let originArray: string[] = [], destinationArray: string[] = []
                possibleOriginRoutes.forEach((data) => {
                    data.forEach((route) => {
                        originArray.push(route.origin)
                        destinationArray.push(route.destination)
                    })
                    if (originArray.includes(route.origin) || destinationArray.includes(route.destination))
                        return;
                    possibleRoutes.push([
                        {
                            origin: route.origin,
                            destination: route.destination
                        },
                        ...data
                    ])
                })
            }
        })
        remainingDestinationRoutes.forEach((route) => {
            possibleDestinationRoutes = getPossibleRoutes(origin, route.origin, maxLayovers - 1)
            if (possibleOriginRoutes?.length > 0) {
                let originArray: string[] = [], destinationArray: string[] = []
                possibleDestinationRoutes.forEach((data) => {
                    data.forEach((route) => {
                        originArray.push(route.origin)
                        destinationArray.push(route.destination)
                    })
                    if (originArray.includes(route.origin) || destinationArray.includes(route.destination))
                        return;
                    possibleRoutes.push([
                        ...data,
                        {
                            origin: route.origin,
                            destination: route.destination
                        }
                    ])
                })
            }
        })
        return possibleRoutes;

    } catch (error) {
        console.log(error);
        return [[
            {
                origin,
                destination
            }
        ]]
    }
}