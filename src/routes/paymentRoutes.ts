import { Router } from "express";
import { createCheckoutSession, stripeWebhook } from "../controllers/paymentController";

const router = Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/stripe_webhook', stripeWebhook); 