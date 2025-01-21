import express from 'express';
import AmadeusController from '../controllers/AmadeusController';

const router = express.Router();
const amadeusController = new AmadeusController();

router.get('/priceCalendar', amadeusController.priceCalendar);
router.post('/bookFlight', amadeusController.bookFlight);
router.post('/price', amadeusController.flightPrice);
router.post('/testbook', amadeusController.testBookFlight);

export default router;
