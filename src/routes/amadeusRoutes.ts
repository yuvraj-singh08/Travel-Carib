import express from 'express';
import AmadeusController from '../controllers/AmadusController';

const router = express.Router();
const duffelController = new AmadeusController();

router.get('/priceCalendar', duffelController.priceCalendar);

export default router;
