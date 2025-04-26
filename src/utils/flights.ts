import { DuffelResponse, OfferRequest } from "@duffel/api/types";
import { routesData } from "../../constants/flightRoutes";
import { AggregatedFareBrand, AirlineProvider, CommissionType, FilterType, Firewall, FlightDate, Offer, PriceCalendar, routeType, Segment, Slice } from "../../types/flightTypes";
import { AmadeusResponseType } from "../../types/amadeusTypes";
import { response } from "express";
import { findCommonFareBrands, getAirlineLogo, getAirlineNameByCode, getDifferenceInMinutes } from "./utils";
import moment from "moment";
import { prisma } from "../prismaClient";
import HttpError from "./httperror";
import { GDS } from "../../constants/cabinClass";
import { RouteOptionParams, RouteOptionResponse } from "../../types/types";

export const amadeusResponseParser = (amadeusResponse: AmadeusResponseType) => {
    try {
        let parsedResponse = [];
        amadeusResponse?.data?.forEach((result) => {
            let responseId = "";
            let routeId = "";
            let segments = [];
            let flag = true;
            result?.itineraries?.[0]?.segments?.forEach((segment, segmentIndex) => {
                if (!flag) {
                    return;
                }
                responseId += segment?.carrierCode + (segment?.number.length === 4 ? segment.number : '0'.repeat(4 - segment?.number.length) + segment?.number)
                routeId += segment.departure.iataCode + segment.arrival.iataCode + ',';
                const checkedBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCheckedBags?.quantity || 0;
                //@ts-ignore
                const cabinBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCabinBags?.quantity || 0;
                segments.push({
                    departing_at: segment?.departure?.at,
                    arriving_at: segment?.arrival?.at,
                    aircraft: {
                        iata_code: segment?.aircraft?.code,
                        name: amadeusResponse?.dictionaries?.aircraft?.[segment?.aircraft?.code],
                    },
                    operating_carrier_flight_number: segment?.number,
                    marketing_carrier_flight_number: segment?.number,
                    operating_carrier: {
                        iata_code: segment?.operating?.carrierCode || segment?.carrierCode,
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
                    duration: segment?.duration,
                    checkedBaggage,
                    cabinBaggage
                    // departure_airport: segment?.departure?.airport?.code,
                    // arrival_airport: segment?.arrival?.airport?.code,
                })
            })

            const n = result?.itineraries?.[0]?.segments?.length;
            const departing_at = segments?.[0]?.departing_at;
            const arriving_at = segments?.[n - 1]?.arriving_at;

            if (flag) {
                const totalAmount = parseFloat(result?.price?.total);
                if (totalAmount > 10000) {
                    console.log("Amadeus Price Error");
                }
                parsedResponse.push({
                    responseId,
                    routeId,
                    sourceId: GDS.amadeus,
                    departing_at: segments?.[0]?.departing_at,
                    arriving_at: segments?.[segments?.length - 1]?.arriving_at,
                    total_amount: totalAmount,
                    slices: [
                        {
                            origin: segments?.[0]?.origin,
                            destination: segments?.[n - 1]?.destination,
                            departing_at,
                            arriving_at,
                            segments: segments,
                            sourceId: GDS.amadeus,
                            gdsOfferId: result.gdsOfferId,
                            travelerPricings: result.travelerPricings,
                            passengers: result.travelerPricings.map((traveller) => {
                                return {
                                    id: traveller.travelerId,
                                    type: traveller.travelerType
                                }
                            })
                        }
                    ],
                })
            }
        })
        return parsedResponse

    } catch (error) {
        console.log("Error while parsing");
        throw error
    }
}

export const duffelResponseParser = (duffelResponse: DuffelResponse<OfferRequest>) => {
    try {
        let response = []
        duffelResponse.data.offers.forEach((result) => {
            let responseId = "";
            let routeId = "";
            let departing_at = result.slices?.[0]?.segments?.[0]?.departing_at;
            let arriving_at = result.slices?.[0]?.segments?.[result.slices?.[0]?.segments?.length - 1]?.arriving_at;
            let flag = true;
            let sliceCabinBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'carry_on')?.[0]?.quantity || 0, sliceCheckedBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'checked')?.[0]?.quantity || 0;
            result.slices?.[0]?.segments?.forEach((segment, segmentIndex) => {
                routeId += segment.origin.iata_code + segment.destination.iata_code + ',';
                responseId += segment.operating_carrier.iata_code + segment.operating_carrier_flight_number

                const baggages = segment?.passengers?.[0]?.baggages
                //@ts-ignore
                // if (segment?.passengers?.[0]?.baggages?.filter((baggage) => baggage.type === "checked")?.quantity == undefined) {
                //     console.log(segment?.passengers?.[0]);
                // }

                const cabinBaggageData = baggages?.filter((baggage) => baggage.type === "carry_on")
                const checkedBaggageData = baggages?.filter((baggage) => baggage.type === "checked")
                const checkedBaggage = checkedBaggageData?.[0]?.quantity || 0;
                const cabinBaggage = cabinBaggageData?.[0]?.quantity || 0;
                sliceCabinBaggage = Math.min(cabinBaggage, sliceCabinBaggage)
                sliceCheckedBaggage = Math.min(checkedBaggage, sliceCheckedBaggage)

                //@ts-ignore
                result.slices[0].segments[segmentIndex].checkedBaggage = checkedBaggage;
                //@ts-ignore
                result.slices[0].segments[segmentIndex].cabinBaggage = cabinBaggage;
                //@ts-ignore
                result.slices[0].sourceId = GDS.duffel;
                //@ts-ignore
                result.slices[0].gdsOfferId = result.id;
                //@ts-ignore
                result.slices[0].passengers = result.passengers;
                //@ts-ignore
                result.slices[0].sliceAmount = result.total_amount;
            })
            const totalAmount = parseFloat(result.total_amount);

            if (flag) {
                response.push({
                    ...result,
                    total_amount: totalAmount,
                    routeId,
                    responseId,
                    departing_at,
                    arriving_at,
                    cabinBaggage: sliceCabinBaggage,
                    checkedBaggage: sliceCheckedBaggage,
                    cabin_class: duffelResponse.data.cabin_class,
                    fareBrand: result.slices[0].fare_brand_name
                })
            }
        })
        const uniqueResponses = new Map<string, any[]>();
        response.forEach((response) => {
            uniqueResponses.set(response.responseId, [...(uniqueResponses.get(response.responseId) || []), response]);
        });
        const result = [];
        uniqueResponses.forEach((offers, key) => {
            let totalAmount = 99999999;
            let fareBrands = [];
            let offerIndex = 0;
            offers.forEach((offer, index) => {
                if (offer.total_amount < totalAmount) {
                    totalAmount = offer.total_amount
                    offerIndex = index;
                }
                fareBrands.push({
                    fareBrand: offer.fareBrand,
                    totalAmount: offer.total_amount,
                    cabinBaggage: offer.cabinBaggage,
                    checkedBaggage: offer.checkedBaggage,
                    offerId: offer.id,
                })
            })
            result.push({
                ...offers[offerIndex],
                fareBrands: fareBrands
            })
        })

        return result;
    } catch (error) {
        throw error;
    }
}

export const duffelMulticityResponseFormatter = (duffelResponse: DuffelResponse<OfferRequest>) => {
    try {
        let response = [];
        duffelResponse.data.offers.forEach((result) => {
            let responseId = "";
            let routeId = "";
            let departing_at = result.slices?.[0]?.segments?.[0]?.departing_at;
            let arriving_at = result.slices?.[0]?.segments?.[result.slices?.[0]?.segments?.length - 1]?.arriving_at;
            let flag = true;
            let sliceCabinBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'carry_on')?.[0]?.quantity || 0, sliceCheckedBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'checked')?.[0]?.quantity || 0;
            let fareOptions = [];
            result.slices.forEach((slice, sliceIndex) => {
                slice.segments?.forEach((segment, segmentIndex) => {
                    routeId += segment.origin.iata_code + segment.destination.iata_code + ',';
                    responseId += segment.operating_carrier.iata_code + segment.operating_carrier_flight_number

                    const baggages = segment?.passengers?.[0]?.baggages
                    //@ts-ignore
                    // if (segment?.passengers?.[0]?.baggages?.filter((baggage) => baggage.type === "checked")?.quantity == undefined) {
                    //     console.log(segment?.passengers?.[0]);
                    // }

                    const cabinBaggageData = baggages?.filter((baggage) => baggage.type === "carry_on")
                    const checkedBaggageData = baggages?.filter((baggage) => baggage.type === "checked")
                    const checkedBaggage = checkedBaggageData?.[0]?.quantity || 0;
                    const cabinBaggage = cabinBaggageData?.[0]?.quantity || 0;
                    sliceCabinBaggage = Math.min(cabinBaggage, sliceCabinBaggage)
                    sliceCheckedBaggage = Math.min(checkedBaggage, sliceCheckedBaggage)

                    //@ts-ignore
                    result.slices[sliceIndex].segments[segmentIndex].checkedBaggage = checkedBaggage;
                    //@ts-ignore
                    result.slices[sliceIndex].segments[segmentIndex].cabinBaggage = cabinBaggage;
                    //@ts-ignore
                    result.slices[sliceIndex].sourceId = GDS.duffel;
                    //@ts-ignore
                    result.slices[sliceIndex].gdsOfferId = result.id;
                    //@ts-ignore
                    result.slices[sliceIndex].passengers = result.passengers;
                    //@ts-ignore
                    result.slices[sliceIndex].sliceAmount = result.total_amount;
                })
                fareOptions.push({
                    fareBrand: slice.fare_brand_name,
                    cabinBaggage: sliceCabinBaggage,
                    checkedBaggage: sliceCheckedBaggage,
                })
            })
            response.push({
                ...result,
                fareOptions,
                routeId,
                responseId,
                departing_at,
                arriving_at,
                fareOptionGDS: "DUFFEL",
                cabinBaggage: sliceCabinBaggage,
                checkedBaggage: sliceCheckedBaggage,
                cabin_class: duffelResponse.data.cabin_class
            })
        })

        const uniqueResponses = new Map<string, any[]>();
        response.forEach((response) => {
            uniqueResponses.set(response.responseId, [...(uniqueResponses.get(response.responseId) || []), response]);
        });
        const result = [];
        uniqueResponses.forEach((offers, key) => {
            let totalAmount = 99999999;
            let fareOptions = [];
            let offerIndex = 0;
            offers.forEach((offer, index) => {
                if (offer.total_amount < totalAmount) {
                    totalAmount = offer.total_amount
                    offerIndex = index;
                }
                fareOptions.push(offer.fareOptions)
            })
            result.push({
                ...offers[offerIndex],
                fareOptions: fareOptions
            })
        })
        return result;
    } catch (error) {
        console.log("Error parsing duffel response: ", error);
        return [];
    }
}

// export const amadeusMultiCityResponseParser = (amadeusResponse: AmadeusResponseType) => {
//     try {
//         let parsedResponse = [];
//         amadeusResponse?.data?.forEach((result) => {
//             let responseId = "";
//             let routeId = "";
//             let segments = [];
//             let flag = true;
//             const slices = result.itineraries.map((itinerary) => {
//                 const segments = itinerary.segments.map((segment): Partial<Segment> => {
//                     return {
//                         origin: {
//                             iata_code: segment.departure.iataCode,
//                         },
//                         destination: {
//                             iata_code: segment. arrival.iataCode,
//                         },
//                         departing_at: segment.departure.at,
//                         arriving_at: segment.arrival.at,
//                         aircraft: segment.aircraft.code,

//                     }
//                 })
//             })
//             result?.itineraries?.[0]?.segments?.forEach((segment, segmentIndex) => {
//                 if (!flag) {
//                     return;
//                 }
//                 responseId += segment?.carrierCode + (segment?.number.length === 4 ? segment.number : '0'.repeat(4 - segment?.number.length) + segment?.number)
//                 routeId += segment.departure.iataCode + segment.arrival.iataCode + ',';
//                 for (let i = 0; i < firewall.length; i++) {
//                     if (firewall[i].from === origin && firewall[i].to === destination) {
//                         if ((segment?.operating?.carrierCode === firewall[i]?.code || segment?.carrierCode === firewall[i]?.code)) {
//                             if (!firewall[i].flightNumber) {
//                                 flag = false;
//                                 break;
//                             }
//                             else if (firewall[i].flightNumber === (segment?.number || segment?.aircraft?.code)) {
//                                 flag = false;
//                                 break;
//                             }
//                         }
//                     }
//                     else if (!firewall[i]?.from && (segment?.operating?.carrierCode === firewall[i]?.code || segment?.carrierCode === firewall[i]?.code)) {
//                         if (!firewall[i].flightNumber) {
//                             flag = false;
//                             break;
//                         }
//                         else if (firewall[i].flightNumber === (segment?.number || segment?.aircraft?.code)) {
//                             flag = false;
//                             break;
//                         }
//                     }
//                 }
//                 const checkedBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCheckedBags?.quantity || 0;
//                 //@ts-ignore
//                 const cabinBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCabinBags?.quantity || 0;
//                 segments.push({
//                     departing_at: segment?.departure?.at,
//                     arriving_at: segment?.arrival?.at,
//                     aircraft: {
//                         iata_code: segment?.aircraft?.code,
//                         name: amadeusResponse?.dictionaries?.aircraft?.[segment?.aircraft?.code],
//                     },
//                     operating_carrier_flight_number: segment?.number,
//                     marketing_carrier_flight_number: segment?.number,
//                     operating_carrier: {
//                         iata_code: segment?.operating?.carrierCode || segment?.carrierCode,
//                         name: amadeusResponse?.dictionaries?.carriers?.[segment?.operating?.carrierCode]
//                     },
//                     flight_number: segment?.aircraft?.code,
//                     destination: {
//                         iata_code: segment?.arrival?.iataCode,
//                         iata_city_code: amadeusResponse?.dictionaries?.locations?.[segment?.arrival?.iataCode]?.cityCode,
//                         iata_country_code: amadeusResponse?.dictionaries?.locations?.[segment?.arrival?.iataCode]?.countryCode
//                     },
//                     origin: {
//                         iata_code: segment?.departure?.iataCode,
//                         iata_city_code: amadeusResponse?.dictionaries?.locations?.[segment?.departure?.iataCode]?.cityCode,
//                         iata_country_code: amadeusResponse?.dictionaries?.locations?.[segment?.departure?.iataCode]?.countryCode
//                     },
//                     duration: segment?.duration,
//                     checkedBaggage,
//                     cabinBaggage
//                     // departure_airport: segment?.departure?.airport?.code,
//                     // arrival_airport: segment?.arrival?.airport?.code,
//                 })
//             })

//             const n = result?.itineraries?.[0]?.segments?.length;
//             const departing_at = segments?.[0]?.departing_at;
//             const arriving_at = segments?.[n - 1]?.arriving_at;

//             if (flag) {
//                 const totalAmount = parseFloat(result?.price?.total);
//                 let commissionAmount = 0;
//                 if (commission) {
//                     if (commission.feeType === 'FIXED') {
//                         commissionAmount = parseFloat(commission.commissionFees);
//                     }
//                     else {
//                         commissionAmount = (totalAmount * parseFloat(commission.commissionFees)) / 100.00;
//                     }
//                 }
//                 if (totalAmount > 10000) {
//                     console.log("Amadeus Price Error");
//                 }
//                 parsedResponse.push({
//                     responseId,
//                     routeId,
//                     sourceId: GDS.amadeus,
//                     departing_at: segments?.[0]?.departing_at,
//                     arriving_at: segments?.[segments?.length - 1]?.arriving_at,
//                     total_amount: commissionAmount + totalAmount,
//                     commissionAmount,
//                     slices: [
//                         {
//                             origin: segments?.[0]?.origin,
//                             destination: segments?.[n - 1]?.destination,
//                             departing_at,
//                             arriving_at,
//                             segments: segments,
//                             sourceId: GDS.amadeus,
//                             gdsOfferId: result.gdsOfferId,
//                             travelerPricings: result.travelerPricings,
//                             passengers: result.travelerPricings.map((traveller) => {
//                                 return {
//                                     id: traveller.travelerId,
//                                     type: traveller.travelerType
//                                 }
//                             })
//                         }
//                     ],
//                 })
//             }
//         })
//         return parsedResponse

//     } catch (error) {
//         console.log("Error while parsing");
//         throw error
//     }
// }

export const duffelNewParser = (duffelResponse: DuffelResponse<OfferRequest>, firewall: any = [], commission: CommissionType, origin: string, destination: string) => {
    try {
        let response = []
        duffelResponse.data.offers.forEach((result) => {
            let responseId = "";
            let routeId = "";
            let departing_at = result.slices?.[0]?.segments?.[0]?.departing_at;
            let arriving_at = result.slices?.[0]?.segments?.[result.slices?.[0]?.segments?.length - 1]?.arriving_at;
            let flag = true;
            let sliceCabinBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'carry_on')?.[0]?.quantity || 0, sliceCheckedBaggage = result?.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages.filter((b) => b.type === 'checked')?.[0]?.quantity || 0;
            result.slices?.[0]?.segments?.forEach((segment, segmentIndex) => {
                routeId += segment.origin.iata_code + segment.destination.iata_code + ',';
                responseId += segment.operating_carrier.iata_code + segment.operating_carrier_flight_number
                for (let i = 0; i < firewall.length; i++) {
                    if (firewall[i].from === origin && firewall[i].to === destination) {
                        if (segment?.operating_carrier?.iata_code === firewall[i]?.code) {
                            if (!firewall[i].flightNumber) {
                                flag = false;
                                break;
                            }
                            else if (firewall[i].flightNumber === (segment?.operating_carrier_flight_number || segment?.marketing_carrier_flight_number)) {
                                flag = false;
                                break;
                            }
                        }
                    }
                    else if (!firewall[i]?.from && segment?.operating_carrier?.iata_code === firewall[i]?.code) {
                        if (!firewall[i].flightNumber) {
                            flag = false;
                            break;
                        }
                        else if (firewall[i].flightNumber === (segment?.operating_carrier_flight_number || segment?.marketing_carrier_flight_number)) {
                            flag = false;
                            break;
                        }
                    }
                }

                const baggages = segment?.passengers?.[0]?.baggages
                //@ts-ignore
                // if (segment?.passengers?.[0]?.baggages?.filter((baggage) => baggage.type === "checked")?.quantity == undefined) {
                //     console.log(segment?.passengers?.[0]);
                // }

                const cabinBaggageData = baggages?.filter((baggage) => baggage.type === "carry_on")
                const checkedBaggageData = baggages?.filter((baggage) => baggage.type === "checked")
                const checkedBaggage = checkedBaggageData?.[0]?.quantity || 0;
                const cabinBaggage = cabinBaggageData?.[0]?.quantity || 0;
                sliceCabinBaggage = Math.min(cabinBaggage, sliceCabinBaggage)
                sliceCheckedBaggage = Math.min(checkedBaggage, sliceCheckedBaggage)

                //@ts-ignore
                result.slices[0].segments[segmentIndex].checkedBaggage = checkedBaggage;
                //@ts-ignore
                result.slices[0].segments[segmentIndex].cabinBaggage = cabinBaggage;
                //@ts-ignore
                result.slices[0].sourceId = GDS.duffel;
                //@ts-ignore
                result.slices[0].gdsOfferId = result.id;
                //@ts-ignore
                result.slices[0].passengers = result.passengers;
                //@ts-ignore
                result.slices[0].sliceAmount = result.total_amount;
            })
            const totalAmount = parseFloat(result.total_amount);
            let commissionAmount = 0;
            if (commission) {
                if (commission.feeType === 'FIXED') {
                    commissionAmount = parseFloat(commission.commissionFees);
                }
                else {
                    commissionAmount = (totalAmount * parseFloat(commission.commissionFees)) / 100.00;
                }
            }

            if (flag) {
                response.push({
                    ...result,
                    total_amount: totalAmount,
                    commissionAmount,
                    routeId,
                    responseId,
                    departing_at,
                    arriving_at,
                    cabinBaggage: sliceCabinBaggage,
                    checkedBaggage: sliceCheckedBaggage,
                    cabin_class: duffelResponse.data.cabin_class,
                    fareBrand: result.slices[0].fare_brand_name
                })
            }
        })
        const uniqueResponses = new Map<string, any[]>();
        response.forEach((response) => {
            uniqueResponses.set(response.responseId, [...(uniqueResponses.get(response.responseId) || []), response]);
        });
        const result = [];
        uniqueResponses.forEach((offers, key) => {
            let totalAmount = 99999999;
            let fareBrands = [];
            let offerIndex = 0;
            offers.forEach((offer, index) => {
                if (offer.total_amount < totalAmount) {
                    totalAmount = offer.total_amount
                    offerIndex = index;
                }
                fareBrands.push({
                    fareBrand: offer.fareBrand,
                    totalAmount: offer.total_amount,
                    cabinBaggage: offer.cabinBaggage,
                    checkedBaggage: offer.checkedBaggage,
                    offerId: offer.id,
                })
            })
            result.push({
                ...offers[offerIndex],
                fareBrands: fareBrands
            })
        })

        return result;
    } catch (error) {
        throw error;
    }
}

export const amadeusNewParser = (amadeusResponse: AmadeusResponseType, firewall: any = [], commission: CommissionType, origin: string, destination: string) => {
    try {
        let parsedResponse = [];
        amadeusResponse?.data?.forEach((result) => {
            let responseId = "";
            let routeId = "";
            let segments = [];
            let flag = true;
            result?.itineraries?.[0]?.segments?.forEach((segment, segmentIndex) => {
                if (!flag) {
                    return;
                }
                responseId += segment?.carrierCode + (segment?.number.length === 4 ? segment.number : '0'.repeat(4 - segment?.number.length) + segment?.number)
                routeId += segment.departure.iataCode + segment.arrival.iataCode + ',';
                for (let i = 0; i < firewall.length; i++) {
                    if (firewall[i].from === origin && firewall[i].to === destination) {
                        if ((segment?.operating?.carrierCode === firewall[i]?.code || segment?.carrierCode === firewall[i]?.code)) {
                            if (!firewall[i].flightNumber) {
                                flag = false;
                                break;
                            }
                            else if (firewall[i].flightNumber === (segment?.number || segment?.aircraft?.code)) {
                                flag = false;
                                break;
                            }
                        }
                    }
                    else if (!firewall[i]?.from && (segment?.operating?.carrierCode === firewall[i]?.code || segment?.carrierCode === firewall[i]?.code)) {
                        if (!firewall[i].flightNumber) {
                            flag = false;
                            break;
                        }
                        else if (firewall[i].flightNumber === (segment?.number || segment?.aircraft?.code)) {
                            flag = false;
                            break;
                        }
                    }
                }
                const checkedBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCheckedBags?.quantity || 0;
                //@ts-ignore
                const cabinBaggage = result?.travelerPricings?.[0]?.fareDetailsBySegment?.[segmentIndex]?.includedCabinBags?.quantity || 0;
                segments.push({
                    departing_at: segment?.departure?.at,
                    arriving_at: segment?.arrival?.at,
                    aircraft: {
                        iata_code: segment?.aircraft?.code,
                        name: amadeusResponse?.dictionaries?.aircraft?.[segment?.aircraft?.code],
                    },
                    operating_carrier_flight_number: segment?.number,
                    marketing_carrier_flight_number: segment?.number,
                    operating_carrier: {
                        iata_code: segment?.operating?.carrierCode || segment?.carrierCode,
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
                    duration: segment?.duration,
                    checkedBaggage,
                    cabinBaggage
                    // departure_airport: segment?.departure?.airport?.code,
                    // arrival_airport: segment?.arrival?.airport?.code,
                })
            })

            const n = result?.itineraries?.[0]?.segments?.length;
            const departing_at = segments?.[0]?.departing_at;
            const arriving_at = segments?.[n - 1]?.arriving_at;

            if (flag) {
                const totalAmount = parseFloat(result?.price?.total);
                let commissionAmount = 0;
                if (commission) {
                    if (commission.feeType === 'FIXED') {
                        commissionAmount = parseFloat(commission.commissionFees);
                    }
                    else {
                        commissionAmount = (totalAmount * parseFloat(commission.commissionFees)) / 100.00;
                    }
                }
                if (totalAmount > 10000) {
                    console.log("Amadeus Price Error");
                }
                parsedResponse.push({
                    responseId,
                    routeId,
                    sourceId: GDS.amadeus,
                    departing_at: segments?.[0]?.departing_at,
                    arriving_at: segments?.[segments?.length - 1]?.arriving_at,
                    total_amount: commissionAmount + totalAmount,
                    commissionAmount,
                    slices: [
                        {
                            origin: segments?.[0]?.origin,
                            destination: segments?.[n - 1]?.destination,
                            departing_at,
                            arriving_at,
                            segments: segments,
                            sourceId: GDS.amadeus,
                            gdsOfferId: result.gdsOfferId,
                            travelerPricings: result.travelerPricings,
                            passengers: result.travelerPricings.map((traveller) => {
                                return {
                                    id: traveller.travelerId,
                                    type: traveller.travelerType
                                }
                            })
                        }
                    ],
                })
            }
        })
        return parsedResponse

    } catch (error) {
        console.log("Error while parsing");
        throw error
    }
}

export const filterResponse = (response: Offer[], filters: FilterType, allFirewall: Firewall[]) => {
    const filteredResponse: Offer[] = response.filter((route) => {
        const minPriceFilter = filters?.MinPrice ? (route.total_amount) >= filters.MinPrice : true
        const maxPriceFilter = filters?.MaxPrice ? (route.total_amount) <= filters.MaxPrice : true;

        //Checkin Baggage
        let checkedBaggage = true;
        let cabinBaggage = true;
        route?.slices?.forEach((slice) => {
            slice?.segments?.forEach((segment) => {
                if (filters.CabinBaggage != undefined && segment?.cabinBaggage < filters.CabinBaggage) {
                    cabinBaggage = false;
                }
                if (filters.CabinBaggage != undefined && segment?.checkedBaggage < filters.CheckedBaggage) {
                    checkedBaggage = false;
                }
            })
        })

        let airlineFirewallFlag = true;
        allFirewall?.forEach((firewall) => {
            if (firewall.flightSequence && route.responseId.includes(firewall.flightSequence)) {
                airlineFirewallFlag = false;
            }
        })


        //Onward Duration
        let MaxOnwardDuration = true;
        let MinOnwardDuration = true;
        if (filters.MaxOnwardDuration) {
            route?.slices?.forEach((slice) => {
                slice?.segments?.forEach((segment) => {
                    if (moment.duration(segment.duration).asMinutes() > filters.MaxOnwardDuration) {
                        MaxOnwardDuration = false;
                    }
                })
            })
        }

        if (filters.MinOnwardDuration) {
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
        const maxStops = filters?.MaxStops !== undefined ? route.stops <= filters.MaxStops : true

        //Preffered Airlines
        let prefferedAirlines = filters?.PrefferedAirlines?.length > 0 ? false : true;
        filters?.PrefferedAirlines?.forEach((airline) => {
            if (route.responseId.includes(airline)) {
                prefferedAirlines = true;
            }
        })

        if (!(airlineFirewallFlag && minPriceFilter && maxPriceFilter && maxDuration && maxStops && MaxOnwardDuration && MinOnwardDuration && ArrivalFilter && DepartureFilter && prefferedAirlines && checkedBaggage && cabinBaggage)) {
            console.log("This");
        }
        return airlineFirewallFlag && minPriceFilter && maxPriceFilter && maxDuration && maxStops && MaxOnwardDuration && MinOnwardDuration && ArrivalFilter && DepartureFilter && prefferedAirlines && checkedBaggage && cabinBaggage;
    });

    return filteredResponse;
}

export function filterRoutes(routes: Offer[]): Offer[] {
    const uniqueRoutes: Map<string, Offer> = new Map();

    for (const route of routes) {
        if(route?.responseId === undefined) {
            console.log("Route without responseId: ", route?.responseId);
        }
        const existingRoute = uniqueRoutes.get(route?.responseId);
        // If no existing route or the new one is cheaper, update the map
        if (!existingRoute || route?.total_amount < existingRoute?.total_amount) {
            uniqueRoutes.set(route?.responseId, route);
        }
    }

    return Array.from(uniqueRoutes.values());
}

// Function to combine the filtered routes from each leg into full routes
export function combineAllRoutes(routeArrays: Offer[][], args?: { minTime?: string, maxTime?: string }): Offer[][] {
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
                    lastSegmentOfCurrentRoute?.[lastSegmentLength - 1].arriving_at,
                    nextRoute?.slices?.[0]?.segments?.[0]?.departing_at
                );

                // Check the time gap is more than the allowed transfer time
                const minTime = parseInt(args?.minTime || process.env.SELF_TRANSFER_TIME_DIFF || '60');
                const maxTime = parseInt(args?.maxTime || process.env.MAX_TIME_DIFF || '1440');

                if (differenceInMinutes > minTime && differenceInMinutes < maxTime) {
                    // Sum the total_amount of the currentRoute and nextRoute
                    const totalAmount = currentRoute.reduce((sum, route) => sum + ((route.total_amount) || 0), 0)
                        + ((nextRoute.total_amount) || 0);

                    // Add the combined route with updated total_amount
                    newResult.push([...currentRoute, { ...nextRoute, total_amount: totalAmount }]);
                }

            }
        }

        result = newResult;
    }

    return result;
}

export function combineMultiCityRoutes(routeArrays: Offer[][]): Offer[][] {
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
                const minTime = parseInt('240');

                if (differenceInMinutes > minTime) {
                    // Add the combined route with updated total_amount
                    newResult.push([...currentRoute, nextRoute]);
                }

            }
        }

        result = newResult;
    }

    return result;
}

export const mapCombinedResponseToOfferType = (response: Offer[][]) => {
    const result = response.map((offer) => {
        let serverSlices = [];
        let stops = 0;
        let responseId = "";
        let routeId = "";
        offer.forEach((route) => {
            serverSlices.push(...(route.slices));
            responseId += route?.responseId
            routeId += route?.routeId
        })
        serverSlices.forEach((slice) => {
            stops += slice?.segments?.length - 1 || 0;
        })
        if (serverSlices?.length > 1) {
            stops += 1
        }
        const offerLength = offer.length
        const lastOfferSlicesLenght = offer[offerLength - 1].slices.length
        const slice: Partial<Slice> = {
            origin: offer?.[0]?.slices?.[0]?.origin,
            destination: offer?.[offerLength - 1]?.slices?.[lastOfferSlicesLenght - 1]?.destination,
            departing_at: offer?.[0]?.slices?.[0]?.departing_at,
            arriving_at: offer?.[offerLength - 1]?.slices?.[lastOfferSlicesLenght - 1].arriving_at,
            segments: [],
            passengers: [],
            selfTransfer: offer.length > 1,
        };

        let totalAmount = 0, totalCommission = 0, cabinBaggage = offer?.[0]?.cabinBaggage || 0, checkedBaggage = offer?.[0]?.checkedBaggage || 0;
        const fareOptions = [];
        offer.forEach((route, index) => {
            totalAmount = totalAmount + route.total_amount;
            totalCommission = totalCommission + (route.commissionAmount);
            cabinBaggage = Math.min(cabinBaggage, route.cabinBaggage || 0);
            checkedBaggage = Math.min(checkedBaggage, route.checkedBaggage || 0)
            if (index > 0) {
                route.slices[0].segments[0].selfTransferSegment = true;
            }
            slice.segments.push(...(route.slices[0].segments))

            if (route.fareOptions)
                route.fareOptions.forEach((fareOption) => {
                    fareOptions.push(fareOption)
                })

        });
        if (totalAmount > 10000) {
            console.log("Route Price is over the limit");
        }

        let commissionAmount = 0;
        const finalAmount = commissionAmount + totalAmount;
        return {
            origin: serverSlices?.[0]?.origin,
            destination: serverSlices?.[serverSlices.length - 1]?.destination,
            departing_at: serverSlices?.[0]?.departing_at,
            arriving_at: serverSlices?.[serverSlices.length - 1]?.arriving_at,
            responseId,
            commissionAmount: commissionAmount || totalCommission,
            routeId,
            stops,
            fareOptionGDS: "",
            // duration: offer[0].duration,
            total_amount: finalAmount,
            // base_currency: offer[0].base_currency,
            // tax_currency: offer[0].tax_currency,
            slices: [slice],
            cabinBaggage,
            checkedBaggage,
            fareOptions,
        };
    })
    return result;
}

export const newNormalizeResponse = (response: Offer[][], cabinClass: string) => {
    const result = response.map((offer) => {
        let slices = [];
        let stops = 0;
        let responseId = "";
        let routeId = "";
        let fareOptions = [];
        offer.forEach((route) => {
            slices.push(...(route.slices));
            responseId += route?.responseId
            routeId += route?.routeId
            fareOptions.push(route.fareOptions);
        })
        slices.forEach((slice) => {
            stops += slice?.segments?.length - 1 || 0;
        })
        if (slices?.length > 1) {
            stops += 1
        }

        let totalAmount = 0, totalCommission = 0, cabinBaggage = offer?.[0]?.cabinBaggage || 0, checkedBaggage = offer?.[0]?.checkedBaggage || 0;
        offer.forEach((route) => {
            totalAmount = totalAmount + route.total_amount;
            totalCommission = totalCommission + (route.commissionAmount);
            cabinBaggage = Math.min(cabinBaggage, route.cabinBaggage || 0);
            checkedBaggage = Math.min(checkedBaggage, route.checkedBaggage || 0)
        });

        let commissionAmount = 0;

        const finalAmount = commissionAmount + totalAmount;
        if (!slices[0].origin) {
            console.log("Slice");
            console.log(slices);
        }
        return {
            origin: slices?.[0]?.origin,
            destination: slices?.[slices.length - 1]?.destination,
            departing_at: slices?.[0]?.departing_at,
            arriving_at: slices?.[slices.length - 1]?.arriving_at,
            responseId,
            commissionAmount: commissionAmount || totalCommission,
            routeId,
            stops,
            // duration: offer[0].duration,
            total_amount: finalAmount,
            // base_currency: offer[0].base_currency,
            // tax_currency: offer[0].tax_currency,
            slices,
            cabinBaggage,
            checkedBaggage,
            cabinClass,
            fareOptions
        };
    })
    return result;

}


export const normalizeResponse = (response: Offer[][], commission: CommissionType[], cabinClass: string) => {
    const result = response.map((offer) => {
        let slices = [];
        let stops = 0;
        let responseId = "";
        let routeId = "";
        const applicableCommission = commission.filter(c => c.supplier === "ALL")?.[0];
        offer.forEach((route) => {
            slices.push(...(route.slices));
            responseId += route?.responseId
            routeId += route?.routeId
        })
        slices.forEach((slice) => {
            stops += slice?.segments?.length - 1 || 0;
        })
        if (slices?.length > 1) {
            stops += 1
        }

        let totalAmount = 0, totalCommission = 0, cabinBaggage = offer?.[0]?.cabinBaggage || 0, checkedBaggage = offer?.[0]?.checkedBaggage || 0;
        const fareBrandsArray = [];
        offer.forEach((route) => {
            totalAmount = totalAmount + route.total_amount;
            totalCommission = totalCommission + (route.commissionAmount);
            cabinBaggage = Math.min(cabinBaggage, route.cabinBaggage || 0);
            checkedBaggage = Math.min(checkedBaggage, route.checkedBaggage || 0)
            if (route.fareBrands)
                fareBrandsArray.push(route.fareBrands);
        });
        const commonFareBrands: AggregatedFareBrand[] = findCommonFareBrands(fareBrandsArray);
        if (totalAmount > 10000) {
            console.log("Route Price is over the limit");
        }

        let commissionAmount = 0;
        if (applicableCommission) {
            if (applicableCommission.feeType === 'FIXED') {
                commissionAmount = parseFloat(applicableCommission.commissionFees);
            }
            else {
                commissionAmount = (totalAmount * parseFloat(applicableCommission.commissionFees)) / 100.00;
            }
        }
        const finalAmount = commissionAmount + totalAmount;
        // if(!slices[0].origin){
        //     console.log("Slice");
        //     console.log(slices);
        // }
        return {
            origin: slices?.[0]?.origin,
            destination: slices?.[slices.length - 1]?.destination,
            departing_at: slices?.[0]?.departing_at,
            arriving_at: slices?.[slices.length - 1]?.arriving_at,
            responseId,
            commissionAmount: commissionAmount || totalCommission,
            routeId,
            stops,
            // duration: offer[0].duration,
            total_amount: finalAmount,
            // base_currency: offer[0].base_currency,
            // tax_currency: offer[0].tax_currency,
            slices,
            cabinBaggage,
            checkedBaggage,
            fareBrands: commonFareBrands,
            cabinClass
        };
    })
    return result;

}

export const normalizeMultiResponse = (response: any, cabinClass: string) => {
    const result = response.map((offers) => {
        let total_amount = 0;
        offers.forEach((offer) => {
            total_amount += parseFloat(offer.total_amount);
        })
        return {
            total_amount,
            itenaries: offers,
            cabinClass
        }
    })
    return result;
}
export const sortResponse = (response: Offer[] | any, sortBy: 'BEST' | 'FAST' | 'CHEAP') => {
    let maxDuration = null, minDuration = null, maxPrice = null, minPrice = null, maxStops = null, minStops = null;

    response.forEach((offer: Offer) => {
        const departingAt = offer?.slices?.[0]?.segments?.[0]?.departing_at;
        const arrivingAt = offer?.slices?.[offer?.slices?.length - 1]?.segments?.[offer?.slices?.[offer?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
        const timeDiff = getDifferenceInMinutes(departingAt, arrivingAt);

        if (maxDuration === null || timeDiff > maxDuration) maxDuration = timeDiff;
        if (minDuration === null || timeDiff < minDuration) minDuration = timeDiff;

        const totalAmount = (offer.total_amount);
        if (maxPrice === null || totalAmount > maxPrice) maxPrice = totalAmount;
        if (minPrice === null || totalAmount < minPrice) minPrice = totalAmount;

        if (maxStops === null || offer.stops > maxStops) maxStops = offer.stops;
        if (minStops === null || offer.stops < minStops) minStops = offer.stops;
    });

    return response.sort((a, b) => {
        if (sortBy === "CHEAP") {
            return parseFloat(a.total_amount) - parseFloat(b.total_amount);
        } else if (sortBy === "FAST") {
            const aDepartingAt = a?.slices?.[0]?.segments?.[0]?.departing_at;
            const aArrivingAt = a?.slices?.[a?.slices?.length - 1]?.segments?.[a?.slices?.[a?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
            const bDepartingAt = b?.slices?.[0]?.segments?.[0]?.departing_at;
            const bArrivingAt = b?.slices?.[b?.slices?.length - 1]?.segments?.[b?.slices?.[b?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;

            const aTimeDiff = getDifferenceInMinutes(aDepartingAt, aArrivingAt);
            const bTimeDiff = getDifferenceInMinutes(bDepartingAt, bArrivingAt);

            return aTimeDiff - bTimeDiff;
        } else if (sortBy === "BEST") {
            const calculateScore = (offer: Offer) => {
                const departingAt = offer?.slices?.[0]?.segments?.[0]?.departing_at;
                const arrivingAt = offer?.slices?.[offer?.slices?.length - 1]?.segments?.[offer?.slices?.[offer?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
                const timeDiff = getDifferenceInMinutes(departingAt, arrivingAt);

                const durationScore = (maxDuration - timeDiff) / (maxDuration - minDuration || 1);
                const priceScore = (maxPrice - (offer.total_amount)) / (maxPrice - minPrice || 1);
                const stopsScore = (maxStops - offer.stops) / (maxStops - minStops || 1);

                // Adjust these weights as needed
                const durationWeight = 0.4;
                const priceWeight = 0.4;
                const stopsWeight = 0.2;

                return (durationScore * durationWeight) + (priceScore * priceWeight) + (stopsScore * stopsWeight);
            };

            return calculateScore(b) - calculateScore(a); // Descending order for "BEST"
        }
        return 0;
    });
};

export const sortMultiCityResponse = (response: Offer[] | any, sortBy: 'BEST' | 'FAST' | 'CHEAP') => {
    let maxDuration = null, minDuration = null, maxPrice = null, minPrice = null, maxStops = null, minStops = null;

    response.forEach((offer: Offer) => {
        const departingAt = offer?.slices?.[0]?.segments?.[0]?.departing_at;
        const arrivingAt = offer?.slices?.[offer?.slices?.length - 1]?.segments?.[offer?.slices?.[offer?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
        const timeDiff = getDifferenceInMinutes(departingAt, arrivingAt);

        if (maxDuration === null || timeDiff > maxDuration) maxDuration = timeDiff;
        if (minDuration === null || timeDiff < minDuration) minDuration = timeDiff;

        const totalAmount = (offer.total_amount);
        if (maxPrice === null || totalAmount > maxPrice) maxPrice = totalAmount;
        if (minPrice === null || totalAmount < minPrice) minPrice = totalAmount;

        if (maxStops === null || offer.stops > maxStops) maxStops = offer.stops;
        if (minStops === null || offer.stops < minStops) minStops = offer.stops;
    });

    return response.sort((a, b) => {
        if (sortBy === "CHEAP") {
            return parseFloat(a.total_amount) - parseFloat(b.total_amount);
        } else if (sortBy === "FAST") {
            const aDepartingAt = a?.slices?.[0]?.segments?.[0]?.departing_at;
            const aArrivingAt = a?.slices?.[a?.slices?.length - 1]?.segments?.[a?.slices?.[a?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
            const bDepartingAt = b?.slices?.[0]?.segments?.[0]?.departing_at;
            const bArrivingAt = b?.slices?.[b?.slices?.length - 1]?.segments?.[b?.slices?.[b?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;

            const aTimeDiff = getDifferenceInMinutes(aDepartingAt, aArrivingAt);
            const bTimeDiff = getDifferenceInMinutes(bDepartingAt, bArrivingAt);

            return aTimeDiff - bTimeDiff;
        } else if (sortBy === "BEST") {
            const calculateScore = (offer: Offer) => {
                const departingAt = offer?.slices?.[0]?.segments?.[0]?.departing_at;
                const arrivingAt = offer?.slices?.[offer?.slices?.length - 1]?.segments?.[offer?.slices?.[offer?.slices?.length - 1]?.segments?.length - 1]?.arriving_at;
                const timeDiff = getDifferenceInMinutes(departingAt, arrivingAt);

                const durationScore = (maxDuration - timeDiff) / (maxDuration - minDuration || 1);
                const priceScore = (maxPrice - (offer.total_amount)) / (maxPrice - minPrice || 1);
                const stopsScore = (maxStops - offer.stops) / (maxStops - minStops || 1);

                // Adjust these weights as needed
                const durationWeight = 0.4;
                const priceWeight = 0.4;
                const stopsWeight = 0.2;

                return (durationScore * durationWeight) + (priceScore * priceWeight) + (stopsScore * stopsWeight);
            };

            return calculateScore(b) - calculateScore(a); // Descending order for "BEST"
        }
        return 0;
    });
};


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

export const getRouteOptions = async ({ origin, destination }: RouteOptionParams): Promise<RouteOptionResponse> => {
    try {
        const searchManagement = await prisma.searchManagement.findMany({
            where: {
                fromOriginAirport: origin,
                toDestinationsAirport: destination,
                status: "ACTIVE"
            }
        });

        if (searchManagement.length === 0) {
            return {
                possibleRoutes: [[{
                    origin, destination
                }]],
                searchManagement: {}
            }
        }

        const formattedRoutes = [];
        searchManagement.forEach((route, routeIndex) => {
            const possibleLayovers = route.connectingAirports as unknown as String[][]
            const results = possibleLayovers.map((layovers, layoversIndex) => {
                const possibleRoutes = layovers.map((layover, index) => {
                    if (index === 0) {
                        return {
                            origin,
                            destination: layover
                        }
                    }
                    else {
                        return {
                            origin: layovers[index - 1],
                            destination: layover
                        }
                    }
                })
                possibleRoutes.push({
                    origin: layovers[layovers.length - 1],
                    destination
                })
                return possibleRoutes;
            })
            formattedRoutes.push(...results);
        })
        const possibleRoutes = [[{ origin, destination }], ...formattedRoutes]
        // const possibleRoutes = formattedRoutes;
        return {
            searchManagement,
            possibleRoutes
        }
    } catch (error) {
        console.log("Error in getting Route options: ", error);
        return {
            possibleRoutes: [[
                { origin, destination }
            ]],
            searchManagement: {}
        }
    }
}

export const getSearchManagementRoutes = async (origin: string, destination: string, maxLayovers: number, firewall: any): Promise<any> => {
    try {
        const searchManagement = await prisma.searchManagement.findMany({
            where: {
                fromOriginAirport: origin,
                toDestinationsAirport: destination,
                status: 'ACTIVE'
            }
        })

        if (searchManagement.length === 0) {
            const routeId = origin + destination;
            let flag = true;
            firewall.forEach((firewall) => {
                const id = firewall.from + firewall.to
                if (id !== '' && routeId === id && (!firewall.code && !firewall.flightSequence)) {
                    flag = false;
                }
            })
            if (flag)
                return {
                    possibleRoutes: [
                        [
                            {
                                origin, destination
                            }
                        ]
                    ],
                    searchManagement: "ff"
                }
            else
                return {
                    possibleRoutes: [],
                    searchManagement: "ff"
                }
        }

        const formattedRoutes = [];
        searchManagement.forEach((route, routeIndex) => {
            const possibleLayovers = route.connectingAirports as unknown as String[][]
            const results = possibleLayovers.map((layovers, layoversIndex) => {
                const possibleRoutes = layovers.map((layover, index) => {
                    if (index === 0) {
                        return {
                            origin,
                            destination: layover
                        }
                    }
                    else {
                        return {
                            origin: layovers[index - 1],
                            destination: layover
                        }
                    }
                })
                possibleRoutes.push({
                    origin: layovers[layovers.length - 1],
                    destination
                })
                return possibleRoutes;
            })
            formattedRoutes.push(...results);
        })
        const possibleRoutes = [[{ origin, destination }], ...formattedRoutes]
        // const possibleRoutes = formattedRoutes;
        return {
            searchManagement,
            possibleRoutes
        }
    } catch (error: any) {
        throw new HttpError(error.message, 400);
    }
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

export function convertToPriceCalendar(data: FlightDate[]): PriceCalendar[] {
    const datePrices: Record<string, number[]> = {};

    // Group prices by departureDate
    data.forEach((flight) => {
        const date = flight.departureDate;
        const price = parseFloat(flight.price.total);

        if (!datePrices[date]) {
            datePrices[date] = [];
        }
        datePrices[date].push(price);
    });

    // Calculate minimum price for each date
    const priceCalendar: PriceCalendar[] = Object.entries(datePrices).map(
        ([date, prices]) => ({
            date,
            minPrice: Math.min(...prices),
        })
    );

    return priceCalendar;
}

export const getAirlineCodes = (response): { airlines: string[], extendedData: AirlineProvider[] } => {
    try {
        const airlineSet = new Set<string>();
        const extendedDataMap = new Map<string, AirlineProvider>();

        response.forEach(route =>
            route.slices.forEach(slice =>
                slice.segments.forEach(segment => {
                    const iata_code = segment.operating_carrier.iata_code;

                    if (!airlineSet.has(iata_code)) {
                        airlineSet.add(iata_code);
                        extendedDataMap.set(iata_code, {
                            id: iata_code,
                            label: segment.operating_carrier.name ?? getAirlineNameByCode(iata_code) ?? iata_code ?? "",
                            src: segment.operating_carrier.logo_symbol_url || getAirlineLogo(iata_code),
                            iata_code
                        });
                    }
                })
            )
        );

        return {
            airlines: Array.from(airlineSet),
            extendedData: Array.from(extendedDataMap.values())
        };
    } catch (error) {
        console.error("Error Getting Airline Codes:", error);
        return { airlines: [], extendedData: [] };
    }
};


export const parseMulticityKiuResponse = (response: Offer[]) => {
    try {
        response.forEach((offer) => {
            const fareOptions = [];
            offer.fareOptions.forEach((fareOption) => {
                fareOptions.push([fareOption]);
            })
            offer.fareOptions = fareOptions;
        });
        return response;
    } catch (error) {
        console.log(error);
        return [];
    }
}