import express from 'express';
import FlightController from '../controllers/FlightController';

const router = express.Router();
const flightController = new FlightController();

router.post('/search-flights', flightController.searchFlights);
router.post('/search-flights-advance', flightController.advanceFlightSearch);
router.post('/get-possible-routes', flightController.getPossibleRoutes);

export default router;
