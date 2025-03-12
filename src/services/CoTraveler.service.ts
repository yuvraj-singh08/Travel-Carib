import { prisma } from "../prismaClient";
import { CoTraveller } from "../schemas/CoTraveller.schema";

export const addCoTravelerService = async (userId: string, coTravellerData: CoTraveller) => {
    try {
        const coTraveller = await prisma.coTraveler.create({
            data: {
                ...coTravellerData,
                userId: userId,
            }
        })
        return coTraveller;
    } catch (error) {
        throw error;
    }
}

export const updateCoTravelerService = async (id: string, coTravellerData: Partial<CoTraveller>) => {
    try {
        const coTraveller = await prisma.coTraveler.update({
            where: { id: id },
            data: coTravellerData,
        })
        return coTraveller;
    } catch (error) {
        throw error;
    }
}

export const deleteCotravellerService = async (id: string) => {
    try {
        const deleted = await prisma.coTraveler.delete({
            where: { id: id },
        })
        return deleted;
    } catch (error) {
        throw error;
    }
}