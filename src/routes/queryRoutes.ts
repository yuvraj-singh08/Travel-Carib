import express from 'express';
import AmadusController from '../controllers/AmadeusController';

const router = express.Router();

async function setupRoutes() {
    try {
        const amadeusController = await AmadusController.create();
        router.get('/priceCalendar', amadeusController.priceCalendar);
        router.post('/bookFlight', amadeusController.bookFlight);
        router.post('/price', amadeusController.flightPrice);
        router.post('/testbook', amadeusController.testBookFlight);

    } catch (error) {
        throw error;
    }
}

setupRoutes();

export default router;