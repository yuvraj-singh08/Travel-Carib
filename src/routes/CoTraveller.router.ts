import express from 'express';
import * as CoTravellerController from '../controllers/CoTravellerController';
import { authenticateToken } from '../middleware/authmiddleware';
const router = express.Router();

router.post('/', authenticateToken, CoTravellerController.addCoTraveller);
router.put('/update', authenticateToken, CoTravellerController.updateCoTraveller);//For updateing
router.delete('/:id', authenticateToken, CoTravellerController.deleteCoTraveller);//For updateing
router.get('/', authenticateToken, CoTravellerController.getCoTravellers);
router.get('/passport/:passportNumber', authenticateToken, CoTravellerController.getCoTravellerByPassport);
router.get('/getCoTravellerById/:id', authenticateToken, CoTravellerController.getCoTravellersById);

export default router;