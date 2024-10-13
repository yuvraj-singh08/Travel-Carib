import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { createCheckoutSessionService, handleStripeWebhook } from "../services/paymentService";

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {

    try {
        //@ts-ignore
        const userId = req.session.user.organizationId;
        const { paymentId } = req.body;
        const paymentUrl = await createCheckoutSessionService({ paymentId, userId});
        return res.status(200).send({ data: paymentUrl, success: true });
    } catch (err) {
        console.error(err);
    }
};

export const stripeWebhook = async (req, res) => {
    try {

        let event;
        if (process.env.STRIPE_WEBHOOK_SECRET) {
            let signature = req.headers['stripe-signature'];

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
        console.error('Error handling Stripe webhook:', error);
    }
};