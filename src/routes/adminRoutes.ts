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
  addEmailSMTP,
  addTerms,
  deleteCommision,
  deleteCookie,
  deleteFirewall,
  deleteRoles,
  deleteSocials,
  deleteTicket,
  deleteUser,
  deletePrivacy,
  deleteEmailSMTP,
  deleteTerm,
  getCommission,
  getCommissionById,
  getCookieById,
  getCookies,
  getFirewall,
  getPrivacy,
  getRoles,
  getEmailSMTP,
  getRolesById,
  getSocialById,
  getSocials,
  getTicketById,
  getTickets,
  getTerms,
  getUserById,
  getPrivacyById,
  getEmailSMTPById,
  getUsers,
  getTermById,
  updateCommision,
  updateCookie,
  updateRoles,
  updateSocial,
  updateTicket,
  updateUser,
  updatePrivacy,
  updateEmailSMTP,
  updateTerm,
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  getDealByCode,
  countTickets,
  getSearchManagement,
  createSearchManagement,
  deleteSearchManagement,
  updateSearchManagement,
  getCommissionTypes,
  getCommissionTypeById,
  addCommissionType,
  updateCommissionType,
  deleteCommissionType,
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  fetchBooking,
  updateBooking,
  deleteBooking,
  registerUser,
  loginUser,
  forgotPassword,
  verifyOTP,
  getAdminById,
  addBaggageWeight,
  getBaggageWeight,
  upadteBaggageWeight,
  deleteFareSetting,
  updateFareSetting,
  getAllFareSettings,
  createFareSetting,
} from "../controllers/adminController";
import { authenticateToken } from "../middleware/authmiddleware";

const router = Router();
router.get("/profile", authenticateToken, getAdminById);

router.post("/register", authenticateToken, registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify", verifyOTP);

router.get("/firewall", getFirewall);
router.post("/add-firewall", authenticateToken, addFirewall);
router.post("/delete-firewall", authenticateToken, deleteFirewall);

router.get("/types", getCommissionTypes);
router.get("/type/:id", getCommissionTypeById);
router.post("/add-type", authenticateToken, addCommissionType);
router.post("/update-type", authenticateToken, updateCommissionType);
router.post("/delete-type", authenticateToken, deleteCommissionType);

router.get("/commission", getCommission);
router.get("/commission/:id", getCommissionById);
router.post("/add-commission", authenticateToken, addCommission);
router.post("/update-commission", authenticateToken, updateCommision);
router.post("/delete-commission", authenticateToken, deleteCommision);

router.get("/roles", getRoles);
router.get("/roles/:id", getRolesById);
router.post("/add-roles", authenticateToken, addRoles);
router.post("/update-roles", authenticateToken, updateRoles);
router.post("/delete-roles", authenticateToken, deleteRoles);

router.get("/users", getUsers);
router.get("/user/:id", getUserById);
router.post("/add-user", authenticateToken, addUser);
router.post("/update-user", authenticateToken, updateUser);
router.post("/delete-user", authenticateToken, deleteUser);

router.get("/tickets", getTickets);
router.get("/ticket/:id", getTicketById);
router.get("/count-tickets", authenticateToken, countTickets);
router.post("/add-ticket", authenticateToken, addTicket);
router.post("/update-ticket", authenticateToken, updateTicket);
router.post("/delete-ticket", authenticateToken, deleteTicket);

router.get("/cookies", getCookies);
router.get("/cookie/:id", getCookieById);
router.post("/add-cookie", authenticateToken, addCookie);
router.post("/update-cookie", authenticateToken, updateCookie);
router.post("/delete-cookie", authenticateToken, deleteCookie);

router.post("/privacies", getPrivacy);
router.get("/privacy/:id", getPrivacyById);
router.post("/add-privacy", authenticateToken, addPrivacy);
router.post("/update-privacy", authenticateToken, updatePrivacy);
router.post("/delete-privacy", authenticateToken, deletePrivacy);

router.get("/socials", getSocials);
router.get("/social/:id", getSocialById);
router.post("/add-social", authenticateToken, addSocials);
router.post("/update-social", authenticateToken, updateSocial);
router.post("/delete-social", authenticateToken, deleteSocials);

router.get("/emails", getEmailSMTP);
router.get("/email/:id", getEmailSMTPById);
router.post("/add-email-smtp", authenticateToken, addEmailSMTP);
router.post("/update-email-smtp", authenticateToken, updateEmailSMTP);
router.post("/delete-email-smtp", authenticateToken, deleteEmailSMTP);

router.get("/deals", getDeals);
router.get("/deal/:id", getDealById);
router.get("/code-deal/:code", getDealByCode);
router.post("/add-deal", authenticateToken, createDeal);
router.post("/update-deal", authenticateToken, updateDeal);
router.post("/delete-deal", authenticateToken, deleteDeal);

router.post("/terms", getTerms);
router.get("/term/:id", getTermById);
router.post("/add-term", authenticateToken, addTerms);
router.post("/update-term", authenticateToken, updateTerm);
router.post("/delete-term", authenticateToken, deleteTerm);

router.get("/search", getSearchManagement);
router.post("/add-search", authenticateToken, createSearchManagement);
router.post("/update-search", authenticateToken, updateSearchManagement);
router.post("/delete-search", authenticateToken, deleteSearchManagement);

router.get("/blogs", getBlogs);
router.get("/blog/:id", getBlogById);
router.post("/add-blog", authenticateToken, createBlog);
router.post("/update-blog", authenticateToken, updateBlog);
router.post("/delete-blog", authenticateToken, deleteBlog);

router.get("/bookings", authenticateToken, fetchBooking);
router.post("/update-booking", authenticateToken, updateBooking);
router.post("/delete-booking", authenticateToken, deleteBooking);

//Baggage Routes
router.post("/baggage", authenticateToken, addBaggageWeight);
router.put("/baggage/:id", authenticateToken, upadteBaggageWeight);
router.get('/baggage', getBaggageWeight);

//fare settings routes
router.post("/createFareSetting", createFareSetting);
router.post("/getAllFareSettings", getAllFareSettings);
router.put("/updateFareSetting/:id", updateFareSetting);
router.post("/deleteFareSetting/:id", deleteFareSetting);

export default router;
