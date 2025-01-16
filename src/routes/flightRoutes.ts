import express from 'express';
import FlightController from '../controllers/FlightController';

const router = express.Router();
const flightController = new FlightController();

router.post('/search-flights-advance', flightController.advanceFlightSearch);
router.post('/search-multi-city', flightController.multiCitySearch);
router.post('/get-possible-routes', flightController.getPossibleRoutes);
router.post('/search-round', flightController.getPossibleRoutes);
router.post('/book', flightController.BookFlight);


export default router;
