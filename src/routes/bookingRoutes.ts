import { Router } from "express";
import {
  addBooking,
  deleteBooking,
  fetchBooking,
  getBookingById,
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
router.get('/:id', authenticateToken, getBookingById);

export default router;
