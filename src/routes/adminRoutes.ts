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
router.post("/delete-firewall", deleteFirewall);

router.get("/commission", getCommission);
router.get("/commission/:id", getCommissionById);
router.post("/add-commission", addCommission);
router.post("/update-commission", updateCommision);
router.post("/delete-commission", deleteCommision);

router.get("/roles", getRoles);
router.get("/roles/:id", getRolesById);
router.post("/add-roles", addRoles);
router.post("/update-roles", updateRoles);
router.post("/delete-roles", deleteRoles);

router.get("/users", getUsers);
router.get("/user/:id", getUserById);
router.post("/add-user", addUser);
router.post("/update-user", updateUser);
router.post("/delete-user", deleteUser);

export default router;
