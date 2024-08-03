import express from 'express';
import DuffelController from '../controllers/DuffelController';

const router = express.Router();
const duffelController = new DuffelController();

router.post('/search-flights', duffelController.searchFlights);
router.post('/get-flight-details', duffelController.getFlightDetails);

export default router;
