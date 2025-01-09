import { Router } from "express";
import { resetPassword } from "../controllers/userController";

const router = Router();

router.post("/reset-password", resetPassword);

export default router;