import cron from 'node-cron';
import { prisma } from '../prismaClient';

export const initializeClearOfferDataJob = () => {
    try {
        cron.schedule("*/5 * * * *", async () => {
            const tenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // Convert to UTC
            const deleted = await prisma.offer.deleteMany({
                where: {
                    createdAt: {
                        lt: tenMinutesAgo, // Delete offers older than 10 mins
                    },
                },
            });
            console.log("Deleted offers older than 10 minutes: ", deleted.count);
        })
    } catch (error) {
        console.log("Cron Job failed: ", error.message);
    }
}