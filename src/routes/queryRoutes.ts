import express from 'express';
import AmadusController from '../controllers/AmadeusController';

const router = express.Router();

async function setupRoutes() {
    try {
        const amadeusController = await AmadusController.create();

        router.get('/cities/:query', amadeusController.citySearch);
        router.post("/flights/search", amadeusController.searchFlights);
        router.post("/flights/price", amadeusController.flightPrice);

    } catch (error) {
        throw error;
    }
}

setupRoutes();

export default router;