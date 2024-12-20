import { Router } from "express";
import {
  addBooking,
  deleteBooking,
  fetchBooking,
  updateBooking,
} from "../controllers/bookingController";
import { authenticateToken } from "../middleware/authmiddleware";

const router = Router();

router.get("/bookings", authenticateToken, fetchBooking);
router.post("/add-booking", authenticateToken, addBooking);
router.post("/update-booking", authenticateToken, updateBooking);
router.post("/delete-booking", authenticateToken, deleteBooking);

export default router;
