import express from 'express';
import AmadusController from '../controllers/AmadusController';

const router = express.Router();
const amadusController = new AmadusController();

router.get('/cities/:query', amadusController.citySearch);

export default router;