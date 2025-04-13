import axios, { AxiosError } from "axios";
import { prisma } from "../prismaClient";
import { COINBASE_API_URL } from "../utils/constants";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// export const createCheckoutSessionService = async ({
//   paymentId,
//   userId,
// }: {
//   paymentId: any;
//   userId: string;
// }) => {
//   try {
//     const payment = await prisma.bookPayment.findUnique({
//       where: {
//         id: paymentId,
//       },
//     });
//     console.log("payment:",payment)
//     const unit_amount = parseInt(`${(payment?.totalAmount * 100)}`);
//     const session = await stripe.checkout.sessions.create({
//       line_items: [
//         {
//           price_data:   {
//             currency: "usd",
//             product_data: {
//               name: `VLN ⇌  BOG`,
              
//               description: `Departure City: VLN | Arrival City: VLN |  Passenger: Hemant Kumar | Date: Sun, 13 Jul 2025 | Departure: 18:15 | Class: Economy
       
//             `.trim(),
//             },
//             unit_amount,
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${process.env.FRONTEND_URL}/dashboard`,
//       cancel_url: `${process.env.FRONTEND_URL}/pages/account-settings/billing/?success=false`,
//       client_reference_id: `${userId}`, // Add organizationId here
//       payment_intent_data: {
//         metadata: {
//           userId: `${userId}`,
//           paymentId: `${paymentId}`, // Add paymentId here
//         },
//       },
//     });
//     console.log("session", session.url);
//     return session.url;
//   } catch (err) {
//     console.error(err);
//   }
// };

export const createCheckoutSessionService = async ({
  paymentId,
  userId,
}: {
  paymentId: any;
  userId: string;
}) => {
  try {
    const payment = await prisma.bookPayment.findUnique({
      where: { id: paymentId },
      include: { Booking: true }, // Include related Booking
    });

    if (!payment || !payment.Booking) {
      throw new Error('Payment or associated Booking not found');
    }

    const booking = payment.Booking;

    // Parse flight details and passenger information
    let originCity = 'N/A';
    let destCity = 'N/A';
    let formattedDate = 'N/A';
    let formattedTime = 'N/A';
    let passengerName = 'N/A';
    let cabinClass = 'Economy';
    let flightRoute = 'N/A';

    try {
      const flightDetails = JSON.parse(booking.flightDetails);
      
      // Extract flight information
      originCity = flightDetails.origin?.iata_code || 'N/A';
      destCity = flightDetails.destination?.iata_code || 'N/A';
      
      // Format date and time
      const departureDate = new Date(flightDetails.departing_at);
      formattedDate = departureDate.toLocaleDateString('en-US', {
        weekday: 'short', 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      formattedTime = departureDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Get passenger information
      const passengers = JSON.parse(booking.passenger);
      const firstPassenger = passengers[0] || {};
      passengerName = `${firstPassenger.firstName || ''} ${firstPassenger.lastName || ''}`.trim();

      // Get cabin class and flight type
      cabinClass = flightDetails.cabinClass || 'Economy';
      const arrow = booking.flight_type === 'ROUNDTRIP' ? '⇌' : '→';
      flightRoute = `${originCity} ${arrow} ${destCity}`;
    } catch (error) {
      console.error('Error parsing flight details:', error);
    }

    console.log("Payment details:", {
      payment,
      flightDetails: booking.flightDetails,
      passenger: booking.passenger,
      flightRoute,
       originCity, 
     destCity ,
     formattedDate ,
     formattedTime ,
     passengerName, 
     cabinClass ,
      

    }
     )

    const unit_amount = Math.round(payment.totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: (payment.currency || 'usd').toLowerCase(),
            product_data: {
              name: flightRoute,
              // images: [`https://ehmndlp.stripocdn.email/content/guids/CABINET_1ca238944af8d2a0d4b6090add7693c35c12b1c5dba03488589ac245599dd1fe/images/screenshot_20250413_005411.png`],
              description: [
                `Departure City: ${originCity}`,
                `Arrival City: ${destCity}`,
                `Passenger: ${passengerName}`,
                `Date: ${formattedDate}`,
                `Departure: ${formattedTime}`,
                `Class: ${cabinClass}`
              ].join(' | '),
            },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/dashboard`,
      cancel_url: `${process.env.FRONTEND_URL}/pages/account-settings/billing/?success=false`,
      client_reference_id: userId,
      payment_intent_data: {
        metadata: {
          userId,
          paymentId,
        },
      },
      // custom_branding: {
      //   logo: "https://ehmndlp.stripocdn.email/content/guids/CABINET_1ca238944af8d2a0d4b6090add7693c35c12b1c5dba03488589ac245599dd1fe/images/screenshot_20250413_005411.png", // <-- Replace with your logo URL
      // },
    });

    return session.url;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const handleStripeWebhook = async (event: any) => {
  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      await updatePaymentStatus(event.data.object);
      break;
    case "payment_intent.payment_failed":
      console.error("PaymentIntent failed:", event.data.object.id);
      break;
    default:
      console.error("Unhandled event type:", event.type);
  }
};

async function updatePaymentStatus(paymentIntent: any) {
  try {
    const { userId, paymentId } = paymentIntent.metadata;

    const result = await prisma.bookPayment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (!result) {
      throw new Error("Payment not found");
    }

    console.log("Payment status updated successfully");
  } catch (error: any) {
    console.error("Error updating payment status:", error?.message);
    throw error;
  }
}

export const createChargeService = async ({
  paymentId,
  userId,
}: {
  paymentId: string;
  userId: string;
}) => {
  try {
    const payment = await prisma.bookPayment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      console.error(`No payment found for paymentId: ${paymentId}`);
      return null;
    }

    const unit_amount = payment.totalAmount; // Ensure the amount is an integer

    const payload = {
      name: "booking",
      description: "Travel caribe payments",
      pricing_type: "fixed_price",
      local_price: {
        amount: unit_amount.toString(), // Convert to string as some APIs prefer it
        currency: "USD",
      },
      metadata: {
        userId: userId,
        paymentId: paymentId,
      },
      cancel_url: `${process.env.FRONTEND_URL}/pages/account-settings/billing/?success=false`,
      redirect_url: `${process.env.FRONTEND_URL}/pages/account-settings/billing/?success=true`,
    };
    
    console.log(
      "Payload being sent to Coinbase:",
      JSON.stringify(payload, null, 2)
    );

    const response = await axios.post(COINBASE_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": process.env.COINBASE_API_KEY!,
      },
    });

    console.log("Successful response from Coinbase:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error("Axios error details:", {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response?.data,
      });
    } else {
      console.error("Non-Axios error:", error);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
};

export const handleCoinbaseWebhookService = async (event: any) => {
  // Handle the event based on its type
  switch (event.type) {
    case "charge:confirmed":
      // Call a function to update payment status to 'completed'
      await updatePaymentStatus(event.data);
      break;

    case "charge:failed":
      console.error("Charge failed:", event.data);
      break;

    case "charge:delayed":
      console.log("Charge delayed:", event.data);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
};
