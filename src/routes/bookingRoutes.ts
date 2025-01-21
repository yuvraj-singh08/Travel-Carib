import { Router } from "express";
import {
  addBooking,
  deleteBooking,
  fetchBooking,
  getBookings,
  updateBooking,
} from "../controllers/bookingController";
import { authenticateToken } from "../middleware/authmiddleware";

const router = Router();

router.post("/bookings", authenticateToken, fetchBooking);
router.get("/bookings", authenticateToken, getBookings);
router.post("/add-booking", authenticateToken, addBooking);
router.post("/update-booking", authenticateToken, updateBooking);
router.post("/delete-booking", authenticateToken, deleteBooking);

export default router;
