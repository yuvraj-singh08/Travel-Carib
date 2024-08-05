import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import { Worker } from "worker_threads";

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

export const parseDuffelResponse1 = (duffelRespnose: DuffelResponse<OfferRequest>) => {
    const response = duffelRespnose.data.offers.map((data) => {
        return {
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