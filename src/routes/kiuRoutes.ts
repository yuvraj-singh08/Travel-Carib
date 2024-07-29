import express from 'express';
import KiuController from '../controllers/KiuController';

const router = express.Router();
const kiuController = new KiuController();

router.post("/flights/search", kiuController.searchFlights);

export default router;