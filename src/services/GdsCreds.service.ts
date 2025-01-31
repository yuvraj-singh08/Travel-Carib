import { prisma } from "../prismaClient";

export type UpdateGdsCredsParam = {
    gds: 'KIU' | 'AMADEUS' | 'DUFFEL'
    testApiKey: string;
    productionApiKey: string;
    productionApiSecret: string;
    testApiSecret: string;
    serviceMode: 'TEST' | 'PRODUCTION';
}

export const updateGdsCredsService = async (data: UpdateGdsCredsParam) => {
    try {
        const updatingValue = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        );

        const existingGds = await prisma.gdsCreds.findFirst({
            where: { gds: data.gds },
            select: { id: true },
        });

        if (!existingGds) {
            throw new Error("GDS credentials not found");
        }

        const updatedData = await prisma.gdsCreds.update({
            where: { id: existingGds.id },
            data: updatingValue,
        });
        return updatedData;
    } catch (error) {
        throw error;
    }
}

export const getGdsCreds = async (gds: 'KIU' | 'AMADEUS' | 'DUFFEL') => {
    try {
        const data = await prisma.gdsCreds.findFirst({
            where: { gds },
        })
        return data;
    } catch (error) {
        throw error;
    }
}