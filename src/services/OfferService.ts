import { prisma } from "../prismaClient"

export async function saveData(data: any) {
    try {
        const promises = data.map(async (item: any) => {
            const response = await prisma.offer.create({
                data: {
                    data: JSON.stringify(item)
                }
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