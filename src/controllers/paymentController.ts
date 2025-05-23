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
import { generateRandomId, uploadImage } from "../utils/bucket";


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
}

  export const makePayment = async (req: Request, res: Response) => { 

    try {
      const {  paymentId,paymentType } = req.body;
      const file = req.file;
      const fileName = `vuelitos-${generateRandomId(5)}.jpeg`;

      const imageUrl = await uploadImage(file.buffer, fileName, file.mimetype);
      console.log("imageUrl",imageUrl)
      const payment = await prisma.bookPayment.update({
      where: {
        id: paymentId,
      },
      data: {
        paymentType: paymentType,
        status: "COMPLETED",
        proofUrl:imageUrl
      },
    });
  if (!payment) {

    return res.status(404).json({ message: "Payment not found" });
  }
  return res.status(200).json({ message: "Payment updated successfully",imageUrl, success: true });  
    
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
    console.error("Error updating payment status:", error?.message);
    
  }
}


// export const createOrUpdatePayment = async (req: Request, res: Response) => {
//   try {
//     const { selectedPayment, value } = req.body;  

//     const payment = await prisma.paymentCMS.upsert({
//       where: { selectedPayment:selectedPayment },
//       update: {
//         value: value,
//       },
//       create: {

//         selectedPayment: selectedPayment,
//         value: value,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Payment created or updated",
//       data: payment,
//     });
//   } catch (error: any) {
//     res.status(400).json({ success: false, error: error.message });
//   }
// };



// Create or update PaymentMethod by "type"
export const createOrUpdatePayment = async (req: Request, res: Response) => {
  const {
    type,
    name,
    isActive = true,
    bankName,
    accountName,
    phone,
    identifier,
    email,
    iban,
    accountNumber,
    order = 0
  } = req.body;

  try {
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { type },
      update: {
        name,
      
        bankName,
        accountName,
        phone,
        identifier,
        email,
        iban,
        accountNumber,
      
      },
      create: {
        type,
        name,
        
        bankName,
        accountName,
        phone,
        identifier,
        email,
        iban,
        accountNumber,
        
      }
    });

    return res.json(paymentMethod);
  } catch (error) {
    console.error('Error creating/updating payment method:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

export const getAllPaymentMethods = async (req, res) => {
  try {
    console.log("api callled")
    const methods = await prisma.paymentMethod.findMany();
    console.log("methods",methods);
    return res.json(methods);
  } catch (error) { 
    console.error("Error fetching payment methods:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}



const algorithm = "aes-256-cbc";
const key = Buffer.from("e63f71a0d3bd94e3846a71d59e34f11f2a6d6cbe517a3c6b447de6712a9ffccb", "hex");

export const encrypt = (text: string): string => {
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, key, iv);
let encrypted = cipher.update(text, "utf8", "hex");
encrypted += cipher.final("hex");
return iv.toString("hex") + ":" + encrypted;
};

export const decrypt = (encryptedText: string): string => {
const [ivHex, encrypted] = encryptedText.split(":");
const iv = Buffer.from(ivHex, "hex");
const decipher = crypto.createDecipheriv(algorithm, key, iv);
let decrypted = decipher.update(encrypted, "hex", "utf8");
decrypted += decipher.final("utf8");
return decrypted;
};


export const getStripeInfo = async (req: Request, res: Response) => {
try {
  console.log("clled this api")
const config = await prisma.stripe_secret.findFirst();
 console.log("clled this api",config)
if (!config) return res.status(404).json({ error: "No Stripe config found" });
return res.json({
  environment: config.environment,
  publishableKey: decrypt(config.publishableKey),
  secret: decrypt(config.secret),
  webbookSecret: decrypt(config.webbookSecret),
});
} catch (error) {
console.error("Error fetching Stripe config:", error);
return res.status(500).json({ error: "Internal server error" });
}
};

export const createStripeConfig = async (req: Request, res: Response) => {
try {
const existing = await prisma.stripe_secret.findFirst();
console.log(existing)
if (existing) return res.status(400).json({ error: "Stripe config already exists" });
const { environment, publishableKey, secret, webbookSecret } = req.body;
console.log("environment, publishableKey, secret, webhookSigningSecret ",environment, publishableKey, secret, webbookSecret )

const newConfig = await prisma.stripe_secret.create({
  data: {
    environment,
    publishableKey: encrypt(publishableKey),
    secret: encrypt(secret),
    webbookSecret: encrypt(webbookSecret),
  },
});
console.log("newConfig",newConfig);

return res.status(201).json({ id: newConfig.id });
} catch (error) {
console.error("Error creating Stripe config:", error);
return res.status(500).json({ error: "Internal server error" });
}
};

export const updateStripeConfig = async (req: Request, res: Response) => {
try {
const existing = await prisma.stripe_secret.findFirst();
if (!existing) return res.status(404).json({ error: "Stripe config not found" });
const { environment, publishableKey, secret, webbookSecret } = req.body;

await prisma.stripe_secret.update({
  where: { id: existing.id },
  data: {
    environment,
    publishableKey: encrypt(publishableKey),
    secret: encrypt(secret),
    webbookSecret: encrypt(webbookSecret),
  },
});

return res.json({ message: "Stripe config updated" });

} catch (error) {
console.error("Error updating Stripe config:", error);
return res.status(500).json({ error: "Internal server error" });
}
};
