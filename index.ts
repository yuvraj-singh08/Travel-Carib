import express, { Request, NextFunction, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pm2 from 'pm2';
dotenv.config();

//Router Imports
import queryRoutes from "./src/routes/queryRoutes";
import kiuRoutes from "./src/routes/kiuRoutes";
import flightRoutes from "./src/routes/flightRoutes";
import duffelRoutes from "./src/routes/duffelRoutes";
import userRoutes from "./src/routes/userRoutes";
import adminRoutes from "./src/routes/adminRoutes";
import storageRoutes from "./src/routes/storageRoutes";
import passengerRoutes from "./src/routes/passengerRoutes";
import bookingRoutes from "./src/routes/bookingRoutes";
import resetRoute from "./src/routes/resetRoute";
import paymentRoutes from "./src/routes/paymentRoutes";
import amadeusRoutes from './src/routes/amadeusRoutes';
import offerRoutes from './src/routes/offer.routes';
import emailRouter from "./src/routes/emailRoute";
import CoTravellerRouter from './src/routes/CoTraveller.router';
import { AuthenticatedRequest } from "./types/express";
import { main } from "./mail/transporter";
import { prisma } from "./src/prismaClient";
import { authenticateToken } from "./src/middleware/authmiddleware";
import { getGdsCreds, updateGdsCreds } from "./src/controllers/gds.controller";
import HttpError from "./src/utils/httperror";
import initializeCrons from "./src/crons";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["*", "https://flight-booking-frontend-admin.vercel.app", "https://flight-booking-frontend-website.vercel.app", "http://localhost:5173", "http://localhost:5174"], // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  console.log(req.ip); 
  res.send(`The server is working fine and running on port 8000 and request was made from : ${req.ip}`);
});

app.post('/server/restart', authenticateToken, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new HttpError("Unauthorized access", 403);
    }
    res.json({ success: true, message: 'Restarting server...' });
    pm2.restart(process.env.PM2_APP_NAME || 'index', (err) => {
      if (err) {
        throw err;
      }
    });
  } catch (error) {
    next(error);
  }
})


app.use(
  express.json({
    // Capture raw body only for Stripe and Coinbase webhook endpoints.
    verify: function (
      req: Request<any, any, any, any>,
      res: Response<any, Record<string, any>>,
      buf: Buffer,
      encoding: string,
    ) {
      console.log('req.originalUrl', req.originalUrl);
      // Check if the request is for Stripe or Coinbase webhook
      if (
        req.originalUrl === '/payment/stripe_webhook' ||
        req.originalUrl === '/payment/coinbase_webhook'
      ) {
        (req as any).rawBody = buf; // Save the raw buffer for both Stripe and Coinbase
      }
    },
  }),
);

app.use("/user", userRoutes);
app.use("/passenger", passengerRoutes);
app.use("/", queryRoutes);
app.use("/kiu", kiuRoutes);
app.use("/flight", flightRoutes);
app.use("/duffel", duffelRoutes);
app.use("/admin", adminRoutes);
app.use("/bucket", storageRoutes);
app.use("/book", bookingRoutes);
app.use("/reset", resetRoute);
app.use("/payment", paymentRoutes);
app.use('/offer', offerRoutes);
app.use('/amadeus', amadeusRoutes);
app.use("/email", emailRouter);
app.use('/co-traveller', CoTravellerRouter)
app.post('/gds/creds/update', authenticateToken, updateGdsCreds);
app.get('/gds/creds', authenticateToken, getGdsCreds);
app.use(
  (err: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log(err);
    let statusCode = err.statusCode || err?.meta?.status || 500;
    let message = err.message || err?.errors?.[0]?.message || "Internal Server Error";
    if (err?.response?.statusCode) {
      statusCode = err.response.statusCode;
    }
    if (err?.description?.[0]?.detail) {
      message = err.description?.[0]?.detail;
    }
    if (err?.description?.error) {
      message = err.description?.error_description || err?.description?.error;
    }

    res.status(statusCode).json({
      success: false,
      message: message,
    });
  }
);

app.post("/send-link", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (user !== null) {
      const info = await main(email, user.id);
      res.json({
        success: true,
        message: "Email sent",
        data: info,
      });
    }
  } catch (e) {
    console.log(e);
    res.json({
      success: false,
      message: e.message,
    });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  initializeCrons();
  console.log(`> App running on port ${PORT}  ...`);
});
