import axios from "axios";
import { prisma } from "../prismaClient";
import { COINBASE_API_URL } from "../utils/constants";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSessionService = async ({ paymentId, userId }: { paymentId: any; userId: string }) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: {
                id :paymentId ,
            },
        });
        const unit_amount = payment?.amount * 100;
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `booking`,
                        },
                        unit_amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.ANALYTICS_FRONTEND_URL}/pages/account-settings/billing/?success=true`,
            cancel_url: `${process.env.ANALYTICS_FRONTEND_URL}/pages/account-settings/billing/?success=false`,
            client_reference_id: `${userId}`, // Add organizationId here
            payment_intent_data: {
                metadata: {
                    userId: `${userId}`,
                    paymentId: `${paymentId}`, // Add paymentId here
                },
            },
        });
        console.log('session', session.url);
        return  session.url
    } catch (err) {
        console.error(err);
    }
};

export const handleStripeWebhook = async (event: any) => {
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            await updatePaymentStatus(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            console.error('PaymentIntent failed:', event.data.object.id);
            break;
        default:
            console.error('Unhandled event type:', event.type);
    }
};

async function updatePaymentStatus(paymentIntent: any) {
    try {
        const { userId, paymentId } = paymentIntent.metadata;

        const result = await prisma.bookPayment.update({
            where: {
                id : paymentId,
            },
            data: {
               status: 'COMPLETED',
            },
          });

        if (!result) {
            throw new Error('Payment not found');
        }

        console.log('Payment status updated successfully');
    } catch (error: any) {
        console.error('Error updating payment status:', error?.message);
        throw error;
    }
}


export const createChargeService = async ({ paymentId, userId }: { paymentId: any; userId: string }) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: {
                id :paymentId ,
            },
        });
        if (!payment) {
            // console.error(`No payment found for invoice: ${invoice} and organizationId: ${organizationId}`);
            return null;
          }

        const unit_amount = payment?.amount * 100;

        const response = await axios.post(COINBASE_API_URL, {
            name: "booking",
            description: "Travel caribe payments",
            pricing_type: "fixed_price",
            local_price: {
              amount: unit_amount,
              currency: "USD"
            },
            metadata:  {
                userId: userId,
                paymentId :paymentId, // Add paymentId here
            },
            cancel_url:`${process.env.ANALYTICS_FRONTEND_URL}/pages/account-settings/billing/?success=false`,
            redirect_url: `${process.env.ANALYTICS_FRONTEND_URL}/pages/account-settings/billing/?success=true`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-CC-Api-Key': process.env.COINBASE_API_KEY
            }
          });
      
          return response.data;
       
    } catch (error) {
        console.error(`Error in fetching invoices`, error);
        return [];
    }
};


export const handleCoinbaseWebhookService = async (event: any) => {
    // Handle the event based on its type
    switch (event.type) {
        case 'charge:confirmed':
            // Call a function to update payment status to 'completed'
            await updatePaymentStatus(event.data);
            break;

        case 'charge:failed':
            console.error('Charge failed:', event.data);
            break;

        case 'charge:delayed':
            console.log('Charge delayed:', event.data);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
};
