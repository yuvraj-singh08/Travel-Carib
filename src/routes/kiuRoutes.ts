import express from 'express';
import KiuController from '../controllers/KiuController';

const router = express.Router();

async function setRoutes() {
    try {
        const kiuController = await KiuController.create();

        router.post('/', kiuController.multiCitySearch);
    } catch (error) {

    }
}

setRoutes();

export default router;