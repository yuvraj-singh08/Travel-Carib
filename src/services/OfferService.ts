import { GDS } from "../../constants/cabinClass";
import { DuffelPassengerResponseType, MulticityOffer, Offer, SetPassengerIdServiceParams } from "../../types/flightTypes";
import DuffelClient from "../api-clients/DuffelClient";
import { prisma } from "../prismaClient"
import HttpError from "../utils/httperror";
import { transformBaggageDetailForPassengers, transformMultiCityBaggageDetailForPassengers } from "../utils/utils";

export async function saveData(data: any, passengers: { adults: number, children?: number, infants?: number }, flightWay: "ONEWAY" | "ROUNDTRIP" | "MULTICITY") {
    try {
        const promises = data.map(async (item: any) => {
            const response = await prisma.offer.create({
                data: {
                    data: JSON.stringify(item),
                    flightWay
                },
            })
            return {
                ...item,
                id: response.id
            };
        })
        const response = await Promise.all(promises);
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const getMultiCityBaggageDataService = async (offer: MulticityOffer) => {
    try {
        const baggageData = await Promise.all(offer.itenaries.map(async (itenary) => {
            return await getBaggageDataService(itenary);
        }))
        return baggageData;
    } catch (error) {
        throw error;
    }
}

export const getBaggageDataService = async (offer: Offer) => {
    try {
        const duffelClient = new DuffelClient();
        const baggageRequests = offer.slices.map(async (slice) => {
            const provider = slice.sourceId;
            switch (provider) {
                case GDS.kiu:
                    //@ts-ignore
                    await this.flightClient.bookKiuFlight(offer, passengers);
                    break;
                case GDS.amadeus:
                    //@ts-ignore
                    return [];
                    break;
                case GDS.duffel:
                    const baggageData = await duffelClient.getAvailableServices(slice.gdsOfferId);
                    return baggageData;
                    break;
                default:
                    throw new HttpError("Provider not found", 404);
            }
        })
        const baggageData = await Promise.all(baggageRequests);
        return baggageData;
    } catch (error) {
        throw error;
    }
}

export async function getOffer(id: string) {
    try {
        const offer = await prisma.offer.findUnique({
            where: {
                id: id
            },
            include: {
                passengers: true
            }
        })
        if (offer.passengers.length === 0) {
            if (offer.flightWay === "ONEWAY") {
                const parsedOffer = JSON.parse(offer.data) as Offer;
                const savedPassengers = await Promise.all(parsedOffer.slices[0].passengers.map((passenger) => {
                    return prisma.offerPassengers.create({
                        data: {
                            type: passenger.type,
                            gds_passenger_id: [passenger.id],
                            offerId: id
                        }
                    })
                }))
                const updatedPassengersRequest = [];
                parsedOffer.slices.forEach(async (slice, index) => {
                    if (index > 0) {
                        slice.passengers.forEach(async (passenger, index) => {
                            updatedPassengersRequest.push(prisma.offerPassengers.update({
                                where: {
                                    id: savedPassengers[index].id
                                },
                                data: {
                                    gds_passenger_id: [...savedPassengers[index].gds_passenger_id, passenger.id]
                                }
                            }))
                            // updatedPassengersRequest.push(prisma.offerPassengers.update({
                            //     where: {
                            //         id: savedPassengers[index].id
                            //     },
                            //     data: {
                            //         gds_passenger_id: [...savedPassengers[index].gds_passenger_id, passenger.id]
                            //     }
                            // }))
                        })
                    }
                })
                const updatedPassengers = await Promise.all(updatedPassengersRequest);
                const passengers = parsedOffer.slices.length > 1 ? updatedPassengers : savedPassengers;
                const availabeServices = await getBaggageDataService(JSON.parse(offer.data));
                //@ts-ignore
                const optimalPassengerBaggageMap = transformBaggageDetailForPassengers(availabeServices, passengers);

                const passengersWithBaggageDetails = await Promise.all(passengers.map((passenger) => {
                    return prisma.offerPassengers.update({
                        where: {
                            id: passenger.id
                        },
                        data: {
                            baggageDetails: (optimalPassengerBaggageMap.get(passenger.id) || [])
                        }
                    })
                }))


                return {
                    ...offer,
                    data: JSON.parse(offer.data),
                    passengers: passengersWithBaggageDetails
                };
            }
            else {
                const parsedOffer = JSON.parse(offer.data) as MulticityOffer;
                const savedPassengers = await Promise.all(parsedOffer.itenaries[0].slices[0].passengers.map((passenger) => {
                    return prisma.offerPassengers.create({
                        data: {
                            type: passenger.type,
                            multicity_passenger_id: JSON.stringify([[passenger.id]]),
                            offerId: id
                        }
                    })
                }))
                // const updatedPassengersRequest = [];
                const updatedPassengers = await parsedOffer.itenaries.map(async (itenary, itenaryIndex) => {
                    itenary.slices.map(async (slice, sliceIndex) => {
                        if (!(itenaryIndex === 0 && sliceIndex === 0)) {
                            slice.passengers.map(async (passenger, index) => {
                                const updatedIds = JSON.parse(savedPassengers[index].multicity_passenger_id);
                                if (sliceIndex === 0) {
                                    updatedIds.push([passenger.id])
                                }
                                else {
                                    updatedIds[itenaryIndex].push(passenger.id)
                                }
                                return await (prisma.offerPassengers.update({
                                    where: {
                                        id: savedPassengers[index].id
                                    },
                                    data: {
                                        multicity_passenger_id: JSON.stringify(updatedIds)
                                    }
                                }))
                                // updatedPassengersRequest.push(prisma.offerPassengers.update({
                                //     where: {
                                //         id: savedPassengers[index].id
                                //     },
                                //     data: {
                                //         multicity_passenger_id: JSON.stringify(updatedIds)
                                //     }
                                // }))
                            })
                        }
                    })
                })
                // const updatedPassengers = await Promise.all(updatedPassengersRequest);
                const updatedOffer = await prisma.offer.findFirst({
                    where: {
                        id
                    },
                    include: {
                        passengers: true
                    }
                })
                const passengers = updatedOffer.passengers.map((passenger) => {
                    return {
                        ...passenger,
                        multicity_passenger_id: JSON.parse(passenger.multicity_passenger_id)
                    }
                });
                const availabeServices = await getMultiCityBaggageDataService(parsedOffer);
                //@ts-ignore
                const optimalPassengerBaggageMap = transformMultiCityBaggageDetailForPassengers(availabeServices, passengers);

                // const passengersWithBaggageDetails = await Promise.all(passengers.map((passenger) => {
                //     return prisma.offerPassengers.update({
                //         where: {
                //             id: passenger.id
                //         },
                //         data: {
                //             baggageDetails: (optimalPassengerBaggageMap.get(passenger.id) || [])
                //         }
                //     })
                // }))


                return {
                    ...offer,
                    data: JSON.parse(offer.data),
                    passengers: passengers
                };
            }
        }
        return {
            ...offer,
            data: JSON.parse(offer.data)
        };

    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const saveAmadeusResponse = async (data: any) => {
    try {
        const promises = data.map(async (item: any) => {
            const response = await prisma.amadeusOffer.create({
                data: {
                    data: JSON.stringify(item),
                },
            })
            return {
                ...item,
                gdsOfferId: response.id
            };
        })
        const response = await Promise.all(promises);
        return response;
    } catch (error) {
        throw error;
    }
}

export const getAmadeusOffer = async (id: string) => {
    try {
        const offer = await prisma.amadeusOffer.findUnique({
            where: {
                id: id
            }
        })
        return {
            ...offer,
            data: JSON.parse(offer.data)
        };
    } catch (error) {
        throw error;
    }
}

// export const createOfferPassengers = async (passengers: { type: "ADULT" | "CHILD" | "INFANT" }[]) => {
//     try {
//         const response = await Promise.all(passengers.map((passenger) => {
//             return prisma.offerPassengers.create({
//                 data: {
//                     passengerType: passenger.type,
//                 }
//             })
//         }))
//         return response;
//     } catch (error) {
//         throw error;
//     }
// }

// export const setOfferPassengersId = async (params: SetPassengerIdServiceParams) => {
//     try {
//         const adultPassengers = params.duffelPassengers.filter(p => p.type === 'adult');
//         const childPassengers = params.duffelPassengers.filter(p => p.type === 'child');
//         const infantPassengers = params.duffelPassengers.filter(p => p.type === 'infant_without_seat');
//         let adultIndex = 0, childIndex = 0, infantIndex = 0;
//         const updatedPassengers = await Promise.all(params.offerPassengers.map((passenger) => {
//             if (passenger.type === 'ADULT') {
//                 return prisma.offerPassengers.update({
//                     where: {
//                         id: passenger.id
//                     },
//                     data: {
//                         duffelId: adultPassengers[adultIndex].id
//                     }
//                 })
//                 adultIndex++;
//             }
//             else if (passenger.type === 'CHILD') {
//                 return prisma.offerPassengers.update({
//                     where: {
//                         id: passenger.id
//                     },
//                     data: {
//                         duffelId: childPassengers[childIndex].id
//                     }
//                 })
//                 childIndex++;
//             }
//             else {
//                 return prisma.offerPassengers.update({
//                     where: {
//                         id: passenger.id
//                     },
//                     data: {
//                         duffelId: infantPassengers[infantIndex].id
//                     }
//                 })
//                 infantIndex++;
//             }
//         }))
//         return updatedPassengers;
//     } catch (error) {
//         throw error;
//     }
// }

