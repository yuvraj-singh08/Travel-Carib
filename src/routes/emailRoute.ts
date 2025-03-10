import express from 'express';
import { ticketDownload, emailSend } from '../controllers/emailController';

const router = express.Router();

router.post('/send',emailSend);
router.get('/pdf/:bookingId',ticketDownload);


export default router;


