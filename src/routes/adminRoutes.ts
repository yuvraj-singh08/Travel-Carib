import { Router } from "express";
import {
  addCommission,
  addFirewall,
  addRoles,
  deleteCommision,
  deleteRoles,
  getCommission,
  getCommissionById,
  getRoles,
  getRolesById,
  updateCommision,
  updateRoles,
} from "../controllers/adminController";

const router = Router();
router.post("/add-firewall", addFirewall);

router.get("/", getCommission);
router.get("/:id", getCommissionById);
router.post("/add-commission", addCommission);
router.put("/update-commission", updateCommision);
router.delete("/delete-commission", deleteCommision);

router.post("/", getRoles);
router.post("/:id", getRolesById);
router.post("/add-roles", addRoles);
router.post("/update-roles", updateRoles);
router.post("/delete-roles", deleteRoles);

export default router;
