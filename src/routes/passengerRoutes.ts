import { Router } from "express";
import {
  addPassenger,
  deletePassenger,
  updatePassenger,
} from "../controllers/passengerController";

const router = Router();

router.post("/add-passenger", addPassenger);
router.post("/update-passenger", updatePassenger);
router.post("/delete-passenger", deletePassenger);

export default router;
