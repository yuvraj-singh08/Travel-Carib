import { Router } from "express";
import {
  addCommission,
  addFirewall,
  deleteCommision,
  getCommission,
  getCommissionById,
  updateCommision,
} from "../controllers/adminController";

const router = Router();
router.post("/add-firewall", addFirewall);

router.get("/", getCommission);
router.get("/:id", getCommissionById);
router.post("/add-commission", addCommission);
router.put("/update-commission", updateCommision);
router.delete("/delete-commission", deleteCommision);

export default router;
