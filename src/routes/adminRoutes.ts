import { Router } from "express";
import {
  addCommission,
  addCookie,
  addFirewall,
  addRoles,
  addSocials,
  addTicket,
  addUser,
  addPrivacy,
  deleteCommision,
  deleteCookie,
  deleteFirewall,
  deleteRoles,
  deleteSocials,
  deleteTicket,
  deleteUser,
  deletePrivacy,
  getCommission,
  getCommissionById,
  getCookieById,
  getCookies,
  getFirewall,
  getPrivacy,
  getRoles,
  getRolesById,
  getSocialById,
  getSocials,
  getTicketById,
  getTickets,
  getUserById,
  getPrivacyById,
  getUsers,
  updateCommision,
  updateCookie,
  updateRoles,
  updateSocial,
  updateTicket,
  updateUser,
  updatePrivacy,
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

router.get("/tickets", getTickets);
router.get("/ticket/:id", getTicketById);
router.post("/add-ticket", addTicket);
router.post("/update-ticket", updateTicket);
router.post("/delete-ticket", deleteTicket);

router.get("/cookies", getCookies);
router.get("/cookie/:id", getCookieById);
router.post("/add-cookie", addCookie);
router.post("/update-cookie", updateCookie);
router.post("/delete-cookie", deleteCookie);

router.get("/privacy", getPrivacy);
router.get("/privacy/:id", getPrivacyById);
router.post("/add-privacy", addPrivacy);
router.post("/update-privacy", updatePrivacy);
router.post("/delete-privacy", deletePrivacy);

router.get("/socials", getSocials);
router.get("/social/:id", getSocialById);
router.post("/add-social", addSocials);
router.post("/update-social", updateSocial);
router.post("/delete-social", deleteSocials);

export default router;
