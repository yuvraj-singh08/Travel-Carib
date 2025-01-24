import { DuffelPassengerResponseType, SetPassengerIdServiceParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient"

export async function saveData(data: any, passengers: { adults: number, children?: number, infants?: number }, flightWay: "ONEWAY" | "ROUNDTRIP" | "MULTICITY") {
    try {
        const promises = data.map(async (item: any) => {
            const response = await prisma.offer.create({
                data: {
                    data: JSON.stringify(item),
                    passengers,
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

export async function getOffer(id: string) {
    try {
        const offer = await prisma.offer.findUnique({
            where: {
                id: id
            }
        })
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
                amadeusResponseId: response.id
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

export const createOfferPassengers = async (passengers: { type: "ADULT" | "CHILD" | "INFANT" }[]) => {
    try {
        const response = await Promise.all(passengers.map((passenger) => {
            return prisma.offerPassengers.create({
                data: {
                    passengerType: passenger.type,
                }
            })
        }))
        return response;
    } catch (error) {
        throw error;
    }
}

export const setOfferPassengersId = async (params: SetPassengerIdServiceParams) => {
    try {
        const adultPassengers = params.duffelPassengers.filter(p => p.type === 'adult');
        const childPassengers = params.duffelPassengers.filter(p => p.type === 'child');
        const infantPassengers = params.duffelPassengers.filter(p => p.type === 'infant_without_seat');
        let adultIndex = 0, childIndex = 0, infantIndex = 0;
        const updatedPassengers = await Promise.all(params.offerPassengers.map((passenger) => {
            if (passenger.type === 'ADULT') {
                return prisma.offerPassengers.update({
                    where: {
                        id: passenger.id
                    },
                    data: {
                        duffelId: adultPassengers[adultIndex].id
                    }
                })
                adultIndex++;
            }
            else if (passenger.type === 'CHILD') {
                return prisma.offerPassengers.update({
                    where: {
                        id: passenger.id
                    },
                    data: {
                        duffelId: childPassengers[childIndex].id
                    }
                })
                childIndex++;
            }
            else {
                return prisma.offerPassengers.update({
                    where: {
                        id: passenger.id
                    },
                    data: {
                        duffelId: infantPassengers[infantIndex].id
                    }
                })
                infantIndex++;
            }
        }))
        return updatedPassengers;
    } catch (error) {
        throw error;
    }
}

