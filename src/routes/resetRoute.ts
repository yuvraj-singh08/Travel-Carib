import { Router } from "express";
import { resetPassword } from "../controllers/userController";
import { resetAdminPassword } from "../controllers/adminController";

const router = Router();

router.post("/reset-password", resetPassword);
router.post("/admin/reset-password", resetAdminPassword);

export default router;