import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import {
  createChargeService,
  createCheckoutSessionService,
  handleCoinbaseWebhookService,
  handleStripeWebhook,
} from "../services/paymentService";
import * as crypto from "crypto";
import { AuthenticatedRequest } from "../../types/express";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req: AuthenticatedRequest, res) => {
  try {
    //@ts-ignore
    const userId = req.user?.id;
    const { paymentId } = req.body;
    const paymentUrl = await createCheckoutSessionService({
      paymentId,
      userId,
    });
    return res.status(200).send({ data: paymentUrl, success: true });
  } catch (err) {
    console.error(err);
  }
};

export const stripeWebhook = async (req, res) => {
  try {
    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      let signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(
          //@ts-ignore
          req.rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`);
        return res.sendStatus(400);
      }
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `.env`,
      // retrieve the event data directly from the request body.
      event = req.body;
    }

    await handleStripeWebhook(event);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
  }
};

export const createCharge = async (req: AuthenticatedRequest, res) => {
  try {
    //@ts-ignore
    const userId = req.user?.id;
    const { paymentId } = req.body;
    const data = await createChargeService({ paymentId, userId });
    return res.status(200).send({ data, success: true });
  } catch (err) {
    console.error(err);
    // next(err);
  }
};

export const coinbaseWebhook = async (req, res) => {
  try {
    let data;
    const COINBASE_WEBHOOK_SECRET = process.env
      .COINBASE_WEBHOOK_SECRET as string;
    // Verify signature if webhook secret is available
    if (COINBASE_WEBHOOK_SECRET) {
      const signature = req.headers["x-cc-webhook-signature"] as string;
      const rawBody = (req as any).rawBody; // Raw body for signature verification

      // Compute HMAC using secret and compare with the received signature
      const hmac = crypto.createHmac("sha256", COINBASE_WEBHOOK_SECRET);
      const computedSignature = hmac.update(rawBody).digest("hex");

      if (signature !== computedSignature) {
        console.error(`⚠️ Webhook signature verification failed.`);
        return res.status(400).send("Invalid signature");
      }

      // Parse the event
      data = req.body;
    } else {
      // If no secret is configured, use the event data directly
      data = req.body;
    }

    // Delegate event handling to payment service
    await handleCoinbaseWebhookService(data?.event);

    // Acknowledge receipt of the event
    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling Coinbase webhook:", error);
    // next(error);  // Pass the error to the next middleware
  }
};
