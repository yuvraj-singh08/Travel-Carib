import { Router } from "express";
import {
  addCommission,
  addFirewall,
  addRoles,
  addUser,
  deleteCommision,
  deleteFirewall,
  deleteRoles,
  deleteUser,
  getCommission,
  getCommissionById,
  getFirewall,
  getRoles,
  getRolesById,
  getUserById,
  getUsers,
  updateCommision,
  updateRoles,
  updateUser,
} from "../controllers/adminController";

const router = Router();
router.get("/firewall", getFirewall);
router.post("/add-firewall", addFirewall);
router.delete("/delete-firewall", deleteFirewall);

router.get("/commission", getCommission);
router.get("/commission/:id", getCommissionById);
router.post("/add-commission", addCommission);
router.put("/update-commission", updateCommision);
router.delete("/delete-commission", deleteCommision);

router.get("/roles", getRoles);
router.get("/roles/:id", getRolesById);
router.post("/add-roles", addRoles);
router.put("/update-roles", updateRoles);
router.delete("/delete-roles", deleteRoles);

router.get("/users", getUsers);
router.get("/user/:id", getUserById);
router.post("/add-user", addUser);
router.put("/update-user", updateUser);
router.delete("/delete-user", deleteUser);

export default router;
