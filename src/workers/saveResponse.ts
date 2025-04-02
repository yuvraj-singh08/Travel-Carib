//@ts-ignore
const { parentPort } = require('worker_threads')
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function saveSearchResponses(data, flightWay) {
    try {
        const chunkSize = 10;
        const chunks = [];

        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const transactions = chunk.map((data) =>
                prisma.offer.create({
                    data: {
                        id: data.id,
                        data: JSON.stringify(data),
                        flightWay,
                    },
                })
            );

            await prisma.$transaction(transactions);
        }

        parentPort.postMessage({ status: "success" });
    } catch (error) {
        parentPort.postMessage({ status: "error", message: error.message });
    }
}

// Listen for messages from the main thread
parentPort.on("message", async (payload) => {
    await saveSearchResponses(payload.data, payload.flightWay);
});
