import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import { routesData } from "../../constants/flightRoutes";
import { routeType } from "../../types/flightTypes";

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
    const response = amadeusResponse[0]?.data || []
    const dictionaries = amadeusResponse[0]?.dictionaries || [];
    amadeusResponse.forEach((data, index) => {
        if (index === 0) {
            return;
        }
        response.push(...(data.data))
        dictionaries.locations = { ...dictionaries?.locations, ...data?.dictionaries?.locations }
        dictionaries.aircraft = { ...dictionaries?.aircraft, ...data?.dictionaries?.aircraft }
        dictionaries.currencies = { ...dictionaries?.currencies, ...data?.dictionaries?.currencies }
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
                    departure_at: segment?.departure?.at,
                    arrival_at: segment?.arrival?.at,
                    operating_carrier: {
                        iata_code: segment?.carrierCode,
                        name: dictionaries?.carriers[segment?.operating?.carrierCode]
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
                possibleOriginRoutes.forEach((data) => {
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
                possibleDestinationRoutes.forEach((data) => {
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