import express from 'express';
import AmadeusController from '../controllers/AmadusController';

const router = express.Router();
const amadeusController = new AmadeusController();

router.get('/priceCalendar', amadeusController.priceCalendar);
router.post('/bookFlight', amadeusController.bookFlight);

export default router;
