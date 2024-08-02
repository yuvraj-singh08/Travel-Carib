import express from 'express';
import FlightController from '../controllers/FlightController';

const router = express.Router();
const flightController = new FlightController();

router.post('/search-flights', flightController.searchFlights);

export default router;
