import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";
import bcrypt from "bcrypt";

export const addFirewall = async (req: Request, res: Response) => {
  const { title, supplier, code, flightNumber, from, to } = req.body;

  try {
    const firewall = await prisma.firewall.create({
      data: {
        title: title,
        supplier: supplier,
        code: code,
        flightNumber: flightNumber,
        from: from,
        to: to,
      },
    });

    if (firewall) {
      res.status(200).json({
        message: "Firewall created",
        firewall: firewall,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Firewall not created" });
    }
  } catch (error) {
    console.error("Error while creating:", error);
    res
      .status(500)
      .json({ error: "Failed to create firewall", success: false });
  }
};

export const getFirewall = async (req: Request, res: Response) => {
  try {
    const firewall = await prisma.firewall.findMany();

    if (firewall) {
      res.status(200).json({
        message: "Firewall fetched",
        firewall: firewall,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Firewall not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch firewall" });
  }
};

export const deleteFirewall = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const firewall = await prisma.firewall.delete({
      where: {
        id: id,
      },
    });

    if (firewall) {
      res.status(200).json({
        message: "Firewall deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Firewall not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete firewall" });
  }
};

export const addCommission = async (req: Request, res: Response) => {
  const { type, commissionTitle, supplier, commissionFees, feeType } = req.body;

  try {
    const commission = await prisma.commissionManagement.create({
      data: {
        type: type,
        commissionTitle: commissionTitle,
        supplier: supplier,
        commissionFees: commissionFees,
        feeType: feeType,
      },
    });

    if (commission) {
      res.status(200).json({
        message: "Commission created",
        commission: commission,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Commission not created" });
    }
  } catch (error) {
    console.error("Error while creating:", error);
    res
      .status(500)
      .json({ error: "Failed to create commission", success: false });
  }
};

export const getCommission = async (req: Request, res: Response) => {
  try {
    const commission = await prisma.commissionManagement.findMany();

    if (commission) {
      res.status(200).json({
        message: "Commission fetched",
        commission: commission,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Commission not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch commission" });
  }
};

export const getCommissionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const commission = await prisma.commissionManagement.findUnique({
      where: {
        id: id,
      },
    });
    if (commission) {
      res.json(commission);
    } else {
      res.status(404).json({ error: "Commission not found" });
    }
  } catch (error) {
    console.error("Error fetching commission:", error);
    res.status(500).json({ error: "Failed to fetch commission" });
  }
};

export const updateCommision = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const commission = await prisma.commissionManagement.update({
      where: {
        id: data.id,
      },
      data: {
        type: data.type,
        commissionTitle: data.commissionTitle,
        supplier: data.supplier,
        commissionFees: data.commissionFees,
        feeType: data.feeType,
      },
    });

    if (commission) {
      res.status(200).json({
        message: "Commission updated",
        commission: commission,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Commission not updated" });
    }
  } catch (err) {
    console.error("Error while updating:", err);
    res.status(500).json({ message: "Failed to update commission" });
  }
};

export const deleteCommision = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const commission = await prisma.commissionManagement.delete({
      where: {
        id: id,
      },
    });

    if (commission) {
      res.status(200).json({
        message: "Commission deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Commission not deleted" });
    }
  } catch (err) {
    console.error("Error while updating:", err);
    res.status(500).json({ message: "Failed to delete commission" });
  }
};

export const addRoles = async (req: Request, res: Response) => {
  const { name, description, permissionGroups } = req.body;

  try {
    const roles = await prisma.role.create({
      data: {
        name: name,
        description: description,
        permissionGroups: permissionGroups,
      },
    });

    if (roles) {
      res.status(200).json({
        message: "Roles created",
        roles: roles,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Roles not created" });
    }
  } catch (error) {
    console.error("Error while creating:", error);
    res.status(500).json({ error: "Failed to create roles", success: false });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany();

    if (roles) {
      res.status(200).json({
        message: "Roles fetched",
        roles: roles,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Roles not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

export const getRolesById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const roles = await prisma.role.findUnique({
      where: {
        id: id,
      },
    });
    if (roles) {
      res.json(roles);
    } else {
      res.status(404).json({ error: "Roles not found" });
    }
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

export const updateRoles = async (req: Request, res: Response) => {
  const { id, title, description, permissionGroups } = req.body;

  try {
    const roles = await prisma.role.update({
      where: {
        id: id,
      },
      data: {
        name: title,
        description: description,
        permissionGroups: permissionGroups,
      },
    });

    if (roles) {
      res.status(200).json({
        message: "Roles updated",
        roles: roles,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Roles not updated" });
    }
  } catch (err) {
    console.error("Error while updating:", err);
    res.status(500).json({ message: "Failed to update roles" });
  }
};

export const deleteRoles = async (req: Request, res: Response) => {
  const { id } = req.body;
  console.log(id);
  try {
    const roles = await prisma.role.delete({
      where: {
        id: id,
      },
    });

    if (roles) {
      res.status(200).json({
        message: "Roles deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Roles not deleted" });
    }
  } catch (err) {
    console.error("Error while updating:", err);
    res.status(500).json({ message: "Failed to delete roles" });
  }
};

export const addUser = async (req: Request, res: Response) => {
  const {
    name,
    uniqueId,
    contact,
    roleName,
    address,
    email,
    password,
    roleId,
    status,
  } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.userManagement.create({
      data: {
        name: name,
        uniqueId: uniqueId,
        email: email,
        contact: contact,
        address: address,
        password: hashedPassword,
        roleId: roleId,
        roleName: roleName,
        status: status,
      },
    });

    if (user) {
      res.status(200).json({
        message: "User created",
        user: user,
        success: true,
      });
    } else {
      res.status(404).json({ error: "User not created" });
    }
  } catch (error) {
    console.error("Error while creating:", error);
    res.status(500).json({ error: "Failed to create user", success: false });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.userManagement.findMany();

    if (users) {
      res.status(200).json({
        message: "Users fetched",
        users: users,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Users not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.userManagement.findUnique({
      where: {
        id: id,
      },
    });

    if (user) {
      res.status(200).json({
        message: "User fetched",
        user: user,
        success: true,
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const {
    id,
    email,
    address,
    contact,
    password,
    name,
    uniqueId,
    status,
    roleId,
    roleName,
  } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const updatedUser = await prisma.userManagement.update({
      where: {
        id: id,
      },
      data: {
        email: email,
        address: address,
        password: hashedPassword,
        name: name,
        contact: contact,
        uniqueId: uniqueId,
        status: status,
        roleId: roleId,
        roleName: roleName,
      },
    });

    if (updatedUser) {
      res.status(200).json({
        message: "User updated",
        user: updatedUser,
        success: true,
      });
    } else {
      res.status(404).json({ error: "User not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const user = await prisma.userManagement.delete({
      where: {
        id: id,
      },
    });

    if (user) {
      res.status(200).json({
        message: "User deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "User not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const addTicket = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const ticket = await prisma.ticketManagement.create({
      data: data,
    });

    if (ticket) {
      res.status(200).json({
        message: "Ticket created",
        ticket: ticket,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Ticket not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add ticket" });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await prisma.ticketManagement.findMany();

    if (tickets) {
      res.status(200).json({
        message: "Tickets fetched",
        tickets: tickets,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Tickets not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const ticket = await prisma.ticketManagement.findUnique({
      where: {
        id: id,
      },
    });

    if (ticket) {
      res.status(200).json({
        message: "Ticket fetched",
        ticket: ticket,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Ticket not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;

  try {
    const updatedTicket = await prisma.ticketManagement.update({
      where: {
        id: id,
      },
      data: data,
    });

    if (updatedTicket) {
      res.status(200).json({
        message: "Ticket updated",
        ticket: updatedTicket,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Ticket not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const ticket = await prisma.ticketManagement.delete({
      where: {
        id: id,
      },
    });

    if (ticket) {
      res.status(200).json({
        message: "Ticket deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Ticket not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
};

export const addCookie = async (req: AuthenticatedRequest, res: Response) => {
  const data = req.body;

  try {
    const cookie = await prisma.cookie.create({
      data: data,
    });

    if (cookie) {
      res.status(200).json({
        message: "Cookie created",
        cookie: cookie,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Cookie not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add cookie" });
  }
};

export const getCookies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cookies = await prisma.cookie.findMany();

    if (cookies) {
      res.status(200).json({
        message: "Cookies fetched",
        cookies: cookies,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Cookies not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch cookies" });
  }
};

export const getCookieById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const cookie = await prisma.cookie.findUnique({
      where: {
        id: id,
      },
    });

    if (cookie) {
      res.status(200).json({
        message: "Cookie fetched",
        cookie: cookie,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Cookie not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch cookie" });
  }
};

export const updateCookie = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    id,
    cookieToggle,
    enableLogging,
    strictlyNecessaryCookies,
    cookieDescription,
    cookieTitle,
    strictlyCookieTitle,
    strictlyCookieDescription,
    contactUsDescription,
    contactUsURL,
  } = req.body;

  try {
    const updatedCookie = await prisma.cookie.update({
      where: {
        id: id,
      },
      data: {
        cookieToggle: cookieToggle,
        enableLogging: enableLogging,
        strictlyNecessaryCookies: strictlyNecessaryCookies,
        cookieDescription: cookieDescription,
        cookieTitle: cookieTitle,
        strictlyCookieTitle: strictlyCookieTitle,
        strictlyCookieDescription: strictlyCookieDescription,
        contactUsDescription: contactUsDescription,
        contactUsURL: contactUsURL,
      },
    });

    if (updatedCookie) {
      res.status(200).json({
        message: "Cookie updated",
        cookie: updatedCookie,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Cookie not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update cookie" });
  }
};

export const deleteCookie = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const cookie = await prisma.cookie.delete({
      where: {
        id: id,
      },
    });

    if (cookie) {
      res.status(200).json({
        message: "Cookie deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Cookie not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete cookie" });
  }
};

export const addSocials = async (req: AuthenticatedRequest, res: Response) => {
  const { socialsEnable, socialPlatforms } = req.body;

  try {
    const socials = await prisma.socialSettings.create({
      data: {
        socialsEnable: socialsEnable,
        socialPlatforms: socialPlatforms,
      },
    });

    if (socials) {
      res.status(200).json({
        message: "Socials added",
        socials: socials,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Socials not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add socials" });
  }
};

export const getSocials = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const socials = await prisma.socialSettings.findMany();

    if (socials) {
      res.status(200).json({
        message: "Socials fetched",
        socials: socials,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Socials not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch socials" });
  }
};

export const getSocialById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const social = await prisma.socialSettings.findUnique({
      where: {
        id: id,
      },
    });

    if (social) {
      res.status(200).json({
        message: "Social fetched",
        social: social,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Social not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch social" });
  }
};

export const updateSocial = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id, socialsEnable, socialPlatforms } = req.body;

  try {
    const updatedSocials = await prisma.socialSettings.update({
      where: {
        id: id,
      },
      data: {
        socialsEnable: socialsEnable,
        socialPlatforms: socialPlatforms,
      },
    });

    if (updatedSocials) {
      res.status(200).json({
        message: "Socials updated",
        socials: updatedSocials,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Socials not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update socials" });
  }
};

export const deleteSocials = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const social = await prisma.socialSettings.delete({
      where: {
        id: id,
      },
    });

    if (social) {
      res.status(200).json({
        message: "Social deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Social not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete social" });
  }
};

export const addPrivacy = async (req: AuthenticatedRequest, res: Response) => {
  const { isEnabled, content } = req.body;

  try {
    const privacy = await prisma.privacyPolicy.create({
      data: {
        isEnabled: isEnabled,
        content: content,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy added",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add privacy" });
  }
};

export const getPrivacy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const privacy = await prisma.privacyPolicy.findMany();

    if (privacy) {
      res.status(200).json({
        message: "Privacy fetched",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch privacy" });
  }
};

export const getPrivacyById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const privacy = await prisma.privacyPolicy.findUnique({
      where: {
        id: id,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy fetched",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch privacy" });
  }
};

export const updatePrivacy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id, isEnabled, content } = req.body;

  try {
    const updatedPrivacy = await prisma.privacyPolicy.update({
      where: {
        id: id,
      },
      data: {
        isEnabled: isEnabled,
        content: content,
      },
    });

    if (updatedPrivacy) {
      res.status(200).json({
        message: "Privacy updated",
        privacy: updatedPrivacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update privacy" });
  }
};

export const deletePrivacy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.body;

  try {
    const privacy = await prisma.privacyPolicy.delete({
      where: {
        id: id,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete privacy" });
  }
};

export const addTerms = async (req: AuthenticatedRequest, res: Response) => {
  const { isEnabled, content } = req.body;

  try {
    const privacy = await prisma.termsAndCondition.create({
      data: {
        isEnabled: isEnabled,
        content: content,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy added",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add privacy" });
  }
};

export const getTerms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const privacy = await prisma.termsAndCondition.findMany();

    if (privacy) {
      res.status(200).json({
        message: "Privacy fetched",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch privacy" });
  }
};

export const getTermById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.body;

  try {
    const privacy = await prisma.termsAndCondition.findUnique({
      where: {
        id: id,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy fetched",
        privacy: privacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch privacy" });
  }
};

export const updateTerm = async (req: AuthenticatedRequest, res: Response) => {
  const { id, isEnabled, content } = req.body;

  try {
    const updatedPrivacy = await prisma.termsAndCondition.update({
      where: {
        id: id,
      },
      data: {
        isEnabled: isEnabled,
        content: content,
      },
    });

    if (updatedPrivacy) {
      res.status(200).json({
        message: "Privacy updated",
        privacy: updatedPrivacy,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update privacy" });
  }
};

export const deleteTerm = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.body;

  try {
    const privacy = await prisma.termsAndCondition.delete({
      where: {
        id: id,
      },
    });

    if (privacy) {
      res.status(200).json({
        message: "Privacy deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Privacy not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete privacy" });
  }
};

export const addEmailSMTP = async (req: Request, res: Response) => {
  const {
    mailDriver,
    mailDriverHost,
    mailPort,
    mailUsername,
    mailPassword,
    mailEncryption,
    mailFromAddress,
    mailFromName,
  } = req.body;

  try {
    const emailSMTP = await prisma.emailSMTP.create({
      data: {
        mailDriver: mailDriver,
        mailDriverHost: mailDriverHost,
        mailPort: mailPort,
        mailUsername: mailUsername,
        mailPassword: mailPassword,
        mailEncryption: mailEncryption,
        mailFromAddress: mailFromAddress,
        mailFromName: mailFromName,
      },
    });

    if (emailSMTP) {
      res.status(200).json({
        message: "Email SMTP added",
        emailSMTP: emailSMTP,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Email SMTP not created" });
    }
  } catch (error) {
    console.log("Error while creating:", error);
    res.status(500).json({ error: "Failed to add email SMTP" });
  }
};

export const getEmailSMTP = async (req: Request, res: Response) => {
  try {
    const emailSMTP = await prisma.emailSMTP.findMany();

    if (emailSMTP) {
      res.status(200).json({
        message: "Email SMTP fetched",
        emailSMTP: emailSMTP,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Email SMTP not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch email SMTP" });
  }
};

export const getEmailSMTPById = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const emailSMTP = await prisma.emailSMTP.findUnique({
      where: {
        id: id,
      },
    });

    if (emailSMTP) {
      res.status(200).json({
        message: "Email SMTP fetched",
        emailSMTP: emailSMTP,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Email SMTP not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch email SMTP" });
  }
};

export const updateEmailSMTP = async (req: Request, res: Response) => {
  const {
    id,
    mailDriver,
    mailDriverHost,
    mailPort,
    mailUsername,
    mailPassword,
    mailEncryption,
    mailFromAddress,
    mailFromName,
  } = req.body;

  try {
    const updatedEmailSMTP = await prisma.emailSMTP.update({
      where: {
        id: id,
      },
      data: {
        mailDriver: mailDriver,
        mailDriverHost: mailDriverHost,
        mailPort: mailPort,
        mailUsername: mailUsername,
        mailPassword: mailPassword,
        mailEncryption: mailEncryption,
        mailFromAddress: mailFromAddress,
        mailFromName: mailFromName,
      },
    });

    if (updatedEmailSMTP) {
      res.status(200).json({
        message: "Email SMTP updated",
        emailSMTP: updatedEmailSMTP,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Email SMTP not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update email SMTP" });
  }
};

export const deleteEmailSMTP = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const emailSMTP = await prisma.emailSMTP.delete({
      where: {
        id: id,
      },
    });

    if (emailSMTP) {
      res.status(200).json({
        message: "Email SMTP deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Email SMTP not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete email SMTP" });
  }
};

export const createDeal = async (req: Request, res: Response) => {
  try {
    const deal = await prisma.deals.create({
      data: req.body,
    });
    res.status(201).json(deal);
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({ error: "Failed to create deal" });
  }
};

export const getDeals = async (req: Request, res: Response) => {
  try {
    const deals = await prisma.deals.findMany();
    res.status(200).json(deals);
  } catch (error) {
    console.error("Error fetching deals:", error);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
};

export const getDealById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deal = await prisma.deals.findUnique({
      where: { id },
    });
    if (deal) {
      res.status(200).json(deal);
    } else {
      res.status(404).json({ error: "Deal not found" });
    }
  } catch (error) {
    console.error("Error fetching deal:", error);
    res.status(500).json({ error: "Failed to fetch deal" });
  }
};

export const getDealByCode = async (req: Request, res: Response) => {
  const { code } = req.params;
  console.log(code);
  
  try {
    const deal = await prisma.deals.findUnique({
      where: { code },
    });
    if (deal) {
      res.status(200).json({ deal: deal });
    } else {
      res.status(404).json({ error: "Deal not found" });
    }
  } catch (error) {
    console.error("Error fetching deal:", error);
    res.status(500).json({ error: "Failed to fetch deal" });
  }
};

export const updateDeal = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;
  try {
    const deal = await prisma.deals.update({
      where: { id },
      data: data,
    });
    res.status(200).json(deal);
  } catch (error) {
    console.error("Error updating deal:", error);
    res.status(500).json({ error: "Failed to update deal" });
  }
};

export const deleteDeal = async (req: Request, res: Response) => {
  const { id } = req.body;
  try {
    const deal = await prisma.deals.delete({
      where: { id },
    });
    res.status(200).json({ message: "Deal deleted", success: true });
  } catch (error) {
    console.error("Error deleting deal:", error);
    res.status(500).json({ error: "Failed to delete deal" });
  }
};

export const addCommissionType = async (req: Request, res: Response) => {
  const { type } = req.body;

  try {
    const commissionType = await prisma.commissionType.create({
      data: {
        type: type,
      },
    });

    if (commissionType) {
      res.status(200).json({
        message: "CommissionType created",
        commissionType: commissionType,
        success: true,
      });
    } else {
      res.status(404).json({ error: "CommissionType not created" });
    }
  } catch (error) {
    console.error("Error while creating:", error);
    res
      .status(500)
      .json({ error: "Failed to create CommissionType", success: false });
  }
};

export const getCommissionTypes = async (req: Request, res: Response) => {
  try {
    const commissionTypes = await prisma.commissionType.findMany();

    if (commissionTypes) {
      res.status(200).json({
        message: "CommissionTypes fetched",
        commissionTypes: commissionTypes,
        success: true,
      });
    } else {
      res.status(404).json({ error: "CommissionTypes not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch CommissionTypes" });
  }
};

export const getCommissionTypeById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const commissionType = await prisma.commissionType.findUnique({
      where: {
        id: id,
      },
    });

    if (commissionType) {
      res.status(200).json({
        message: "CommissionType fetched",
        commissionType: commissionType,
        success: true,
      });
    } else {
      res.status(404).json({ error: "CommissionType not found" });
    }
  } catch (error) {
    console.error("Error while fetching:", error);
    res.status(500).json({ error: "Failed to fetch CommissionType" });
  }
};

export const updateCommissionType = async (req: Request, res: Response) => {
  const { id, type } = req.body;

  try {
    const updatedCommissionType = await prisma.commissionType.update({
      where: {
        id: id,
      },
      data: {
        type: type,
      },
    });

    if (updatedCommissionType) {
      res.status(200).json({
        message: "CommissionType updated",
        commissionType: updatedCommissionType,
        success: true,
      });
    } else {
      res.status(404).json({ error: "CommissionType not updated" });
    }
  } catch (error) {
    console.error("Error while updating:", error);
    res.status(500).json({ error: "Failed to update CommissionType" });
  }
};

export const deleteCommissionType = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const commissionType = await prisma.commissionType.delete({
      where: {
        id: id,
      },
    });

    if (commissionType) {
      res.status(200).json({
        message: "CommissionType deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "CommissionType not deleted" });
    }
  } catch (error) {
    console.error("Error while deleting:", error);
    res.status(500).json({ error: "Failed to delete CommissionType" });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.create({
      data: req.body,
    });
    res.status(201).json(payment);
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany();
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });
    if (payment) {
      res.status(200).json(payment);
    } else {
      res.status(404).json({ error: "Payment not found" });
    }
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;
  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: data,
    });
    res.status(200).json(payment);
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ error: "Failed to update payment" });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  const { id } = req.body;
  try {
    const payment = await prisma.payment.delete({
      where: { id },
    });
    res.status(200).json({ message: "Payment deleted", success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ error: "Failed to delete payment" });
  }
};

export const countTickets = async (req: Request, res: Response) => {
  try {
    const pendingTickets = await prisma.ticketManagement.count({
      where: {
        status: "PENDING",
      },
    });

    const openTickets = await prisma.ticketManagement.count({
      where: {
        status: "OPEN",
      },
    });

    const resolvedTickets = await prisma.ticketManagement.count({
      where: {
        status: "RESOLVE",
      },
    });

    res.status(200).json({
      pending: pendingTickets,
      open: openTickets,
      resolve: resolvedTickets,
    });
  } catch (error) {
    console.error("Error counting tickets:", error);
    res.status(500).json({ error: "Failed to count tickets" });
  }
};

export const createSearchManagement = async (req: Request, res: Response) => {
  try {
    const newEntry = await prisma.searchManagement.create({
      data: req.body,
    });
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error creating SearchManagement entry:", error);
    res.status(500).json({ error: "Failed to create SearchManagement entry" });
  }
};

// Read/Search SearchManagement entries
export const getSearchManagement = async (req: Request, res: Response) => {
  try {
    const entries = await prisma.searchManagement.findMany();
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching SearchManagement entries:", error);
    res.status(500).json({ error: "Failed to fetch SearchManagement entries" });
  }
};

// Update an existing SearchManagement entry
export const updateSearchManagement = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;
  try {
    const updatedEntry = await prisma.searchManagement.update({
      where: { id },
      data: data,
    });
    res.status(200).json(updatedEntry);
  } catch (error) {
    console.error("Error updating SearchManagement entry:", error);
    res.status(500).json({ error: "Failed to update SearchManagement entry" });
  }
};

// Delete a SearchManagement entry
export const deleteSearchManagement = async (req: Request, res: Response) => {
  const { id } = req.body;
  try {
    await prisma.searchManagement.delete({
      where: { id },
    });
    res
      .status(200)
      .json({ message: "SearchManagement entry deleted", success: true });
  } catch (error) {
    console.error("Error deleting SearchManagement entry:", error);
    res.status(500).json({ error: "Failed to delete SearchManagement entry" });
  }
};
