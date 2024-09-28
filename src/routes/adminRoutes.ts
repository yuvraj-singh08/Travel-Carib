import { Router } from "express";
import { addFirewall } from "../controllers/adminController";

const router = Router();
router.post("/add", addFirewall);

export default router;