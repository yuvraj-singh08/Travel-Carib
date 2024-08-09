import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import { Worker } from "worker_threads";
import { routesData } from "../../constants/flightRoutes";
import { routeType } from "../../types/flightTypes";

export function parseDuffelResponsesInParallel(responses) {
    const workers = responses.map((response) => {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./src/utils/worker.ts');
            worker.postMessage(response);
            worker.on('message', (parsedResponse) => {
                resolve(parsedResponse);
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    });

    return Promise.all(workers);
}


export const getRoute = (segment1: any, segment2: any) => {
    const pairs = [];
    segment1?.forEach(segment1Offer => {
        // const departureTime = offer?.slices[0]?.segments[0]?.departing_at;
        const arrivalTime = segment1Offer.arrivalTime;
        segment2?.forEach(segment2Offer => {
            const departureTime = segment2Offer.departureTime;
            const dateArrival = new Date(arrivalTime);
            const dateDeparture = new Date(departureTime);
            //@ts-ignore
            const diffInMs = dateArrival - dateDeparture;
            const diffInHours = diffInMs / 3600000;
            if (diffInHours > 2) {
                pairs?.push({
                    origin: segment1Offer?.origin,
                    destination: segment2Offer?.destination,
                    departureTime,
                    arrivalTime,
                    duration: diffInHours,
                    segments: [
                        segment1Offer?.segments,
                        segment2Offer?.segments
                    ]
                });
            }
        });
    });
    console.log("End of getRoute", (new Date()))
    return pairs;
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

export const parseDuffelResponse1 = (duffelRespnose: DuffelResponse<OfferRequest>) => {
    let responseId = "";
    const response = duffelRespnose.data.offers.map((data) => {
        data.slices[0]?.segments?.forEach((segment) => {
            responseId += `${segment?.marketing_carrier?.iata_code}${segment?.marketing_carrier_flight_number}`
        })
        return {
            responseId: responseId,
            origin: data?.slices[0]?.origin,
            destination: data?.slices[0]?.destination,
            departureTime: data?.slices[0]?.segments[0]?.departing_at,
            arrivalTime: data?.slices[0]?.segments[data?.slices[0]?.segments.length - 1]?.arriving_at,
            // duration: data?.slices[0]?.duration,
            // layovers: data?.slices[0]?.destination,
            // class: data?.itineraries[0]?.pricing?.fare_basis,
            segments: [data?.slices[0]?.segments],
            prices: {
                total_amount: data?.total_amount,
                tax_amount: data?.tax_amount,
                base_currency: data?.base_currency,
                tax_currency: data?.tax_currency
            }
        }
    })
    return response;
}

export const parseDuffelResponse2 = (duffelRespnose: DuffelResponse<OfferRequest>) => {
    const response = duffelRespnose.data.offers.map((data) => {
        return {
            origin: data?.slices[0]?.origin,
            destination: data?.slices[0]?.destination,
            departureTime: data?.slices[0]?.segments[0]?.departing_at,
            arrivalTime: data?.slices[0]?.segments[data?.slices[0]?.segments.length - 1]?.arriving_at,
            // duration: data?.slices[0]?.duration,
            // layovers: data?.slices[0]?.destination,
            // class: data?.itineraries[0]?.pricing?.fare_basis,
            segments: data?.slices[0]?.segments,
            prices: {
                total_amount: data?.total_amount,
                tax_amount: data?.tax_amount,
                base_currency: data?.base_currency,
                tax_currency: data?.tax_currency
            }
        }
    })
    return response;
}

// export const parsedAmadeusResponse = (amadeusResponse: any, originLocation: string, destinationLocation: string, maxLayovers) => {
//     try {
//         const parsedResponse = []
//         amadeusResponse?.forEach((response) => {
//             response?.forEach((route) => {
//                 const possibleRoute = []
//                 route?.data?.forEach((offer) => {
//                     const layover = offer.itineraries[0].segments.length
//                     if (layover <= maxLayovers) {
//                         const segments = offer?.itineraries[0]?.segments?.map((itinery) => {
//                             return {
//                                 origin: {
//                                     iata_city_code: itinery?.departure?.iataCode,
//                                 },
//                                 destination: {
//                                     iata_city_code: itinery?.arrival?.iataCode,
//                                 },
//                                 departing_at: itinery?.departure?.at,
//                                 arrival_at: itinery?.arrival?.at,
//                                 operating_carrier: {
//                                     iata_code: itinery?.operating?.carrierCode
//                                 },
//                                 marketing_carrier: {
//                                     iata_code: itinery?.operating?.carrierCode
//                                 },
//                                 aircraft: {
//                                     code: itinery?.aircraft?.code
//                                 },
//                                 operating_carrier_flight_number: itinery?.aircraft?.code
//                             }
//                         })
//                         possibleRoute.push({
//                             origin: offer?.itineraries[0].segments[0].departure.iataCode,
//                             destination: offer?.itineraries[0].segments[offer?.itineraries[0].segments.length - 1].arrival?.iataCode,
//                             segments: [segments],
//                             prices: {
//                                 total_amount: offer?.price?.total,
//                                 tax_amount: offer?.price?.total - offer?.price?.base,
//                                 base_currency: offer?.price?.currency,
//                                 tax_currency: offer?.price?.currency
//                             },
//                             fareDetailsBySegment: offer?.travelerPricings[0]?.fareDetailsBySegment
//                         })
//                     }
//                 });
//                 parsedResponse.push(possibleRoute)
//             })
//         })
//         return parsedResponse;
//     } catch (error) {
//         throw error
//     }
// }

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

const parseResponse = (possibleRoute: any, originLocation: string, destinationLocation: string, maxLayovers: number) => {
    try {
        const response = [];
        possibleRoute.forEach((route) => {
            const response = route?.data?.map((results) => {

            })
        })
    } catch (error) {

    }
}

export const parseAmadeusResponse1 = (amadeusResponse: any, originLocation: string, destinationLocation: string) => {
    const response = amadeusResponse?.data?.map((data) => {
        const segments = data?.itineraries[0]?.segments?.map((itinery) => {
            return {
                origin: {
                    iata_city_code: itinery?.departure?.iataCode,
                },
                destination: {
                    iata_city_code: itinery?.arrival?.iataCode,
                },
                departing_at: itinery?.departure?.at,
                arrival_at: itinery?.arrival?.at,
                operating_carrier: {
                    iata_code: itinery?.operating?.carrierCode
                },
                marketing_carrier: {
                    iata_code: itinery?.operating?.carrierCode
                },
                aircraft: {
                    code: itinery?.aircraft?.code
                },
                operating_carrier_flight_number: itinery?.aircraft?.code
            }
        })
        return {
            origin: originLocation,
            destination: destinationLocation,
            segments: [segments],
            prices: {
                total_amount: data?.price?.total,
                tax_amount: data?.price?.total - data?.price?.base,
                base_currency: data?.price?.currency,
                tax_currency: data?.price?.currency
            },
            fareDetailsBySegment: data?.travelerPricings[0]?.fareDetailsBySegment
        }
    })
    return response
}

export const parseAmadeusResponse2 = (amadeusResponse: any, originLocation: string, destinationLocation: string) => {
    const response = amadeusResponse?.data?.map((data) => {
        const segments = data?.itineraries[0]?.segments?.map((itinery) => {
            return {
                origin: {
                    iata_city_code: itinery?.departure?.iataCode,
                },
                destination: {
                    iata_city_code: itinery?.arrival?.iataCode,
                },
                departing_at: itinery?.departure?.at,
                arrival_at: itinery?.arrival?.at,
                operating_carrier: {
                    iata_code: itinery?.operating?.carrierCode
                },
                marketing_carrier: {
                    iata_code: itinery?.operating?.carrierCode
                },
                aircraft: {
                    code: itinery?.aircraft?.code
                },
                operating_carrier_flight_number: itinery?.aircraft?.code
            }
        })
        return {
            origin: originLocation,
            destination: destinationLocation,
            segments: segments,
            prices: {
                total_amount: data?.price?.total,
                tax_amount: data?.price?.total - data?.price?.base,
                base_currency: data?.price?.currency,
                tax_currency: data?.price?.currency
            },
            fareDetailsBySegment: data?.travelerPricings[0]?.fareDetailsBySegment
        }
    })
    return response
}

export const amadeusGetRoute = (segment1: any, segment2: any) => {
    const pairs = [];
    segment1?.forEach(segment1Offer => {
        console.log("Start of getRoute", (new Date()))
        const n = segment1Offer?.itineraries[0]?.segments?.length;
        const arrivalTime = segment1Offer?.itineraries[0]?.segments[n - 1]?.arrival.at;
        segment2?.forEach(segment2Offer => {
            const departureTime = segment2Offer?.itineraries[0]?.segments[0]?.departure.at;
            const dateArrival = new Date(arrivalTime);
            const dateDeparture = new Date(departureTime);
            //@ts-ignore
            const diffInMs = dateArrival - dateDeparture;
            const diffInHours = diffInMs / 3600000;
            if (diffInHours > 2) {
                pairs?.push({
                    origin: segment1Offer?.itineraries[0]?.segments[0]?.departure,
                    destination: segment2Offer?.itineraries[0]?.segments[n - 1]?.arrival,
                    departureTime,
                    arrivalTime,
                    duration: diffInHours,
                    segments: {
                        segment1: segment1Offer?.itineraries,
                        segment2: segment2Offer?.itineraries
                    }
                });
            }

        })

    })
    return pairs;
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