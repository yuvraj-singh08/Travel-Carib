import cron from 'node-cron';
import { prisma } from '../prismaClient';

export const initializeClearOfferDataJob = () => {
    try {
        cron.schedule("*/5 * * * *", async () => {
            const tenMinutesAgo = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // Convert to UTC
            const offers = await prisma.offer.findMany();
            const deleted = await prisma.offer.deleteMany({
                where: {
                    createdAt: {
                        lt: tenMinutesAgo, // Delete offers older than 10 mins
                    },
                },
            });
            const deletedAmadeus = await prisma.amadeusOffer.deleteMany({
                where: {
                    createdAt: {
                        lt: tenMinutesAgo, // Delete Amadeus offers older than 10 mins
                    },
                }
            })
        })
    } catch (error) {
        console.log("Cron Job failed: ", error.message);
    }
}