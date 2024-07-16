import express from 'express';
import AmadusController from '../controllers/AmadusController';

const router = express.Router();
const amadusController = new AmadusController();

router.get('/cities/:query', amadusController.citySearch);
router.post("/flights/search", amadusController.searchFlights)
router.post("/flights/price",amadusController.flightPrice)

export default router;