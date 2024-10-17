import { Router } from "express";
import { coinbaseWebhook, createCharge, createCheckoutSession, stripeWebhook } from "../controllers/paymentController";

const router = Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/stripe_webhook', stripeWebhook); 

router.post('/coinbase/create-charge',createCharge);
router.post('/coinbase_webhook',coinbaseWebhook); 

export default router;