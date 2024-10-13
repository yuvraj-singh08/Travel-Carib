import { Router } from "express";
import {
  addBooking,
  deleteBooking,
  fetchBooking,
  updateBooking,
} from "../controllers/bookingController";

const router = Router();

router.get("/bookings", fetchBooking);
router.post("/add-booking", addBooking);
router.post("/update-booking", updateBooking);
router.post("/delete-booking", deleteBooking);

export default router;
