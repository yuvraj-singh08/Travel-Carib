import { Router } from "express";
import {
  coinbaseWebhook,
  createCharge,
  createCheckoutSession,
  stripeWebhook,
} from "../controllers/paymentController";
import { authenticateToken } from "../middleware/authmiddleware";

const router = Router();

router.post(
  "/create-checkout-session",
  authenticateToken,
  createCheckoutSession
);
router.post("/stripe_webhook", stripeWebhook);

router.post("/coinbase/create-charge", authenticateToken, createCharge);
router.post("/coinbase_webhook", coinbaseWebhook);

export default router;
