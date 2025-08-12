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
  uploadImages,
  createScrapingModule,
  getAllScrapingModules,
  getScrapingModuleById,
  updateScrapingModule,
  deleteScrapingModule,
} from "../controllers/adminController";
import { authenticateToken, checkRolePermission } from "../middleware/authmiddleware";
import { upload } from "../utils/multer";
import { resolve } from "path";
import { actions, resources } from "../utils/constants";

const router = Router();
router.get("/profile", authenticateToken, getAdminById);

router.post("/register", authenticateToken, registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify", verifyOTP); 

router.get("/firewall", authenticateToken,checkRolePermission(resources.FIREWALL,actions.VIEW ), getFirewall);
router.post("/add-firewall", authenticateToken,checkRolePermission(resources.FIREWALL,actions.CREATE ), addFirewall);
router.post("/delete-firewall", authenticateToken,checkRolePermission(resources.FIREWALL,actions.DELETE ), deleteFirewall);

router.get("/types", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.VIEW ), getCommissionTypes);
router.get("/type/:id", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.VIEW ), getCommissionTypeById);
router.post("/add-type", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.CREATE ), addCommissionType);
router.post("/update-type", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.UPDATE ), updateCommissionType);
router.post("/delete-type", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.DELETE ), deleteCommissionType);

router.get("/commission", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.VIEW ), getCommission);
router.get("/commission/:id", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.VIEW ), getCommissionById);
router.post("/add-commission", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.CREATE ), addCommission);
router.post("/update-commission", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.UPDATE ), updateCommision);
router.post("/delete-commission", authenticateToken,checkRolePermission(resources.COMMISSION_DETAILS,actions.DELETE ), deleteCommision);

router.get("/roles", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.VIEW ), getRoles);
router.get("/roles/:id", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.VIEW ), getRolesById);
router.post("/add-roles", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.CREATE ), addRoles);
router.post("/update-roles", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.UPDATE ), updateRoles);
router.post("/delete-roles", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.DELETE ), deleteRoles);

router.get("/users", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.VIEW ), getUsers);
router.get("/user/:id", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.VIEW ), getUserById);
router.post("/add-user", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.CREATE ), addUser);
router.post("/update-user", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.UPDATE ), updateUser);
router.post("/delete-user", authenticateToken,checkRolePermission(resources.USER_MANAGEMENT,actions.DELETE ), deleteUser);

router.get("/tickets", authenticateToken, getTickets);
router.get("/ticket/:id", authenticateToken, getTicketById);
router.get("/count-tickets", authenticateToken, countTickets);
router.post("/add-ticket", authenticateToken, addTicket);
router.post("/update-ticket", authenticateToken,checkRolePermission(resources.TICKET_SYSTEM,actions.UPDATE ), updateTicket);
router.post("/delete-ticket", authenticateToken,checkRolePermission(resources.TICKET_SYSTEM,actions.DELETE ), deleteTicket);

router.get("/cookies", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getCookies);
router.get("/cookie/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getCookieById);
router.post("/add-cookie", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addCookie);
router.post("/update-cookie", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateCookie);
router.post("/delete-cookie", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteCookie);

router.post("/privacies", authenticateToken, getPrivacy);
router.get("/privacy/:id", authenticateToken, getPrivacyById);
router.post("/add-privacy", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addPrivacy);
router.post("/update-privacy", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updatePrivacy);
router.post("/delete-privacy", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deletePrivacy);

router.get("/socials", authenticateToken, getSocials);
router.get("/social/:id", authenticateToken, getSocialById);
router.post("/add-social", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addSocials);
router.post("/update-social", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateSocial);
router.post("/delete-social", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteSocials);

router.get("/emails", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getEmailSMTP);
router.get("/email/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getEmailSMTPById);
router.post("/add-email-smtp", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addEmailSMTP);
router.post("/update-email-smtp", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateEmailSMTP);
router.post("/delete-email-smtp", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteEmailSMTP);

router.get("/deals", authenticateToken, getDeals);
router.get("/deal/:id", authenticateToken, getDealById);
router.get("/code-deal/:code", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getDealByCode);
router.post("/add-deal", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), createDeal);
router.post("/update-deal", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateDeal);
router.post("/delete-deal", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteDeal);


router.post("/terms", authenticateToken, getTerms);
router.get("/term/:id", authenticateToken, getTermById);
router.post("/add-term", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addTerms);
router.post("/update-term", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateTerm);
router.post("/delete-term", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteTerm);

router.get("/search", authenticateToken,checkRolePermission(resources.SEARCH_MANAGEMENT,actions.VIEW ), getSearchManagement);
router.post("/add-search", authenticateToken,checkRolePermission(resources.SEARCH_MANAGEMENT,actions.CREATE ), createSearchManagement);
router.post("/update-search", authenticateToken,checkRolePermission(resources.SEARCH_MANAGEMENT,actions.UPDATE ), updateSearchManagement);
router.post("/delete-search", authenticateToken,checkRolePermission(resources.SEARCH_MANAGEMENT,actions.DELETE ), deleteSearchManagement);

router.post("/blogs", authenticateToken, getBlogs);
router.get("/blog/:id", authenticateToken, getBlogById);
router.post("/add-blog",  upload.single("image"), createBlog);
router.post("/update-blog", authenticateToken,checkRolePermission(resources.LANDING_PAGE,actions.UPDATE ), updateBlog);
router.post("/delete-blog", authenticateToken,checkRolePermission(resources.LANDING_PAGE,actions.DELETE ), deleteBlog);

router.post("/upload-image", upload.array("images"), uploadImages);




router.get("/bookings", authenticateToken,checkRolePermission(resources.DASHBOARD,actions.VIEW ), fetchBooking);
router.post("/update-booking", authenticateToken,checkRolePermission(resources.DASHBOARD,actions.UPDATE ), updateBooking);
router.post("/delete-booking", authenticateToken,checkRolePermission(resources.DASHBOARD,actions.DELETE ), deleteBooking);

//Baggage Routes
router.post("/baggage", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), addBaggageWeight);
router.put("/baggage/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), upadteBaggageWeight);
router.get('/baggage', authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getBaggageWeight);

//fare settings routes
router.post("/createFareSetting", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ), createFareSetting);
router.post("/getAllFareSettings", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getAllFareSettings);
router.put("/updateFareSetting/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateFareSetting);
router.delete("/deleteFareSetting/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteFareSetting);


// Scraping Module Routes
router.post("/scraping-modules", authenticateToken,checkRolePermission(resources.SETTINGS,actions.CREATE ),  createScrapingModule);
router.get("/scraping-modules", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getAllScrapingModules);
router.get("/scraping-modules/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.VIEW ), getScrapingModuleById);
router.put("/scraping-modules/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.UPDATE ), updateScrapingModule);
router.delete("/scraping-modules/:id", authenticateToken,checkRolePermission(resources.SETTINGS,actions.DELETE ), deleteScrapingModule);

export default router;
