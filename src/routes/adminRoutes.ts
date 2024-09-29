import { Router } from "express";
import {
  addCommission,
  addFirewall,
  deleteCommision,
  getCommission,
  updateCommision,
} from "../controllers/adminController";

const router = Router();
router.post("/add-firewall", addFirewall);

router.post("/add-commission", addCommission);
router.post("/get-commission", getCommission);
router.put("/update-commission", updateCommision);
router.delete("/delete-commission", deleteCommision);

export default router;
