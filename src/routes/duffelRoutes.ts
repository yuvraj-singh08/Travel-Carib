import express from 'express';
import DuffelController from '../controllers/DuffelController';

const router = express.Router();

async function setRoutes() {
    try {
        const duffelController = await DuffelController.create();

        router.post('/search-flights', duffelController.searchFlights);
        router.post('/get-flight-details', duffelController.getFlightDetails);
        router.post('/create-order', duffelController.createOrder);
        router.get('/available-services/:offerId', duffelController.getAvailableServices);
        router.get('/get-offer-request/:id', duffelController.getOfferRequestById);
        router.get('/get-offer/:id', duffelController.getOfferById);

    } catch (error) {
        throw error;
    }
}

setRoutes();

export default router;
