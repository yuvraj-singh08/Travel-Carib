import express from 'express';
import KiuController from '../controllers/KiuController';

const router = express.Router();

async function setRoutes() {
    try {
        const kiuController = new KiuController({ kiuClient: await KiuController.create() });
        router.post('/new', kiuController.newSearchFlights);
        router.post('/', kiuController.multiCitySearch);
    } catch (error) {

    }
}

setRoutes();

export default router;