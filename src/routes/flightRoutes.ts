import express from 'express';
import FlightController from '../controllers/FlightController';

const router = express.Router();
const flightController = new FlightController();

router.post('/search-flights', (req, res) => flightController.searchFlights(req, res));

export default router;
