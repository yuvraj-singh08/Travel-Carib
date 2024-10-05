import { Router } from "express";
import { addBooking } from "../controllers/bookingController";

const router = Router();

router.post("/add-booking", addBooking);

export default router;
