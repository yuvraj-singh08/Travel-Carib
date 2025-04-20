import { Router } from "express";
import {
  coinbaseWebhook,
  createCharge,
  createCheckoutSession,
  createOrUpdatePayment,
  getAllPaymentMethods,
  makePayment,
  stripeWebhook,
} from "../controllers/paymentController";
import { authenticateToken } from "../middleware/authmiddleware";
import { getPaymentDetails } from "../controllers/bookingController";
import { upload } from "../utils/multer";
const router = Router();

router.post(
  "/create-checkout-session",
  authenticateToken,
  createCheckoutSession
);
router.post("/stripe_webhook", stripeWebhook);

router.post("/coinbase/create-charge", authenticateToken, createCharge);
router.post("/coinbase_webhook", coinbaseWebhook);
router.get('/:id', getPaymentDetails)
router.post("/upload-proof", upload.single("image"), makePayment);
router.post("/paymentCMS",createOrUpdatePayment)
router.post("/getAllPaymentMethods",getAllPaymentMethods)

export default router;  
