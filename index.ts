import express, { NextFunction, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
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
import { AuthenticatedRequest } from "./types/express";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // Allow all origins
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("The server is working fine and running on port 8000");
});
app.use("/user", userRoutes);
app.use("/passenger", passengerRoutes);
app.use("/", queryRoutes);
app.use("/kiu", kiuRoutes);
app.use("/flight", flightRoutes);
app.use("/duffel", duffelRoutes);
app.use("/admin", adminRoutes);
app.use("/bucket", storageRoutes);
app.use(
  (err: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      message: message,
    });
  }
);
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`> App running on port ${PORT}  ...`);
});
