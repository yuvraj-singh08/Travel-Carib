import { Router } from "express";
import { resetPassword } from "../controllers/userController";

const router = Router();

router.get("/reset-password", resetPassword);

export default router;