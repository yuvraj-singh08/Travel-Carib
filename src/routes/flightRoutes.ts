import express from 'express';
import FlightController from '../controllers/FlightController';
import { authenticateToken } from '../middleware/authmiddleware';
import FlightClient from '../api-clients/FlightClient';

const router = express.Router();

async function setupRoutes() {
  try {
    // Initialize FlightClient asynchronously
    const flightClient = await FlightClient.create();

    // Pass the initialized flightClient to FlightController
    const flightController = new FlightController(flightClient);

    // Define routes
    router.post('/search-flights-advance', flightController.advanceFlightSearch);
    router.post('/search-multi-city', flightController.multiCitySearch);
    router.post('/get-possible-routes', flightController.getPossibleRoutes);
    router.post('/search-round', flightController.getPossibleRoutes);
    router.post('/book', authenticateToken, flightController.BookFlight);
    router.post('/new-multicity-search', flightController.newMulticitSearch)
    router.get('/fullData/:searchKey', flightController.getFullData);

  } catch (error) {
    console.error('Error initializing FlightController:', error);
  }
}

// Ensure routes are set up properly
setupRoutes();

export default router;
