import { Router } from "express";
import { resetPassword } from "../controllers/userController";

const router = Router();

router.post("/reset-password", resetPassword);
router.post("/admin/reset-password", resetPassword);

export default router;