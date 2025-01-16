import express from 'express';
const router = express.Router();
import * as OfferController from '../controllers/offer.controller';

router.get('/:id', OfferController.getOfferController);

export default router;