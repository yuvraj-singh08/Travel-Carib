import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { handlePrismaError } from "../utils/prismaError";
import HttpError from "../utils/httperror";
import { sendOTP } from "../../nodemailer/transporter";
import { AdminPermissions } from "../../types/adminTypes";
import { BaggageType } from "@prisma/client";
import { prisma } from "../prismaClient";

import { generateRandomId, uploadImage } from "../utils/bucket";
import { actions, resources } from "../utils/constants";
import { checkPermission } from "../utils/permission";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const SALT_ROUNDS = 10;

export const registerUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user.role !== "ADMIN") {
    throw new HttpError("Unauthorized", 403);
  }
  const { email, password, firstName, lastName, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const response = await prisma.admin.create({
      data: {
        email: email,
        password: hashedPassword,
        firstname: firstName,
        lastname: lastName,
        role: role,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user: response,
      success: true,
    });
  } catch (error) {
    next(handlePrismaError(error));
  }
};

//forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.admin.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    //send email
    const messageId = await sendOTP(email, user.id);

    if (!messageId) {
      return res.status(500).json({
        message: "Failed to send OTP",
        success: false,
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

//verify-otp
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.admin.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const otpData = await prisma.otp.findFirst({
      where: {
        email: email,
        otp: otp,
      },
    });

    if (!otpData) {
      return res.status(404).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    const deleteOTP = await prisma.otp.delete({
      where: {
        id: otpData.id,
      },
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      success: true,
    });
  } catch (e) {
    next(handlePrismaError(e));
  }
};

export const resetAdminPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.admin.findUnique({
      where: {
        email: email as string,
      },
    });

    if (user !== null) {
      const hashed = await bcrypt.hash(password as string, SALT_ROUNDS);
      const updated = await prisma.admin.update({
        where: {
          email: email as string,
        },
        data: {
          password: hashed,
        },
      });

      console.log(updated);

      if (updated) {
        return res.status(200).json({
          message: "Password changed",
          success: true,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to update password",
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
  } catch (e) {
    next(handlePrismaError(e));
  }
};

// Login User
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.admin.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let isPasswordValid: Boolean;

    if (password) {
      isPasswordValid = await bcrypt.compare(password, user.password);

      console.log(isPasswordValid);

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    const role = await prisma.userManagement.findFirst({
      where: {
        adminId: user.id,
      },
      select: {
        roleId: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, roleId: role.roleId },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({ token, user, roleId: role.roleId });
  } catch (error) {
    next(handlePrismaError(error));
  }
};

export const getAdminById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const adminId = req.user?.id;

  if (!adminId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  try {
    let data;
    const user = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
      include: {
        userManagement: true,
      },
    });

    console.log("user...............",user);

    data = {
      id: user?.id,
      email: user?.email,
      role: user?.userManagement[0]?.roleName + user?.role,
      firstname: user?.firstname,
      lastname: user?.lastname,
    };

    const specificNames = {
      Dashboard: "dashboard",
      Firewall: "firewall",
      "Customer Details": "customer_details",
      "Commission Details": "commission_details",
      "User Management": "user_management",
      "Ticket System": "ticket_system",
      "Landing Page": "landing_page",
      Settings: "settings",
      "Search Management": "search_management",
    };

    if (user.userManagement.length > 0) {
      const specificRole = await prisma.role.findUnique({
        where: {
          id: user?.userManagement[0]?.roleId!,
        },
      });

      const permissions: AdminPermissions[] =
        specificRole?.permissionGroups as any;

      const updatedPermissions = permissions.map((permission) => {
        const view = permission.permissions.View.view;
        const create = permission.permissions.Create.view;
        const update = permission.permissions.Update.view;
        const del = permission.permissions.Delete.view;

        const actions: string[] = [];

        if (view) {
          actions.push("view");
        }
        if (create) {
          actions.push("create");
        }
        if (update) {
          actions.push("update");
        }
        if (del) {
          actions.push("delete");
        }

        return {
          name: specificNames[permission.name],
          actions: actions,
        };
      });

      data.permissions = updatedPermissions;
    } else {
      const updatedPermissions = Object.keys(specificNames).map(
        (permission) => {
          const actions: string[] = ["view", "delete", "create", "update"];

          return {
            name: specificNames[permission],
            actions: actions,
          };
        }
      );

      data.permissions = updatedPermissions;
    }

    if (data) {
      return res.json(data);
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    next(handlePrismaError(error));

    // console.error("Error fetching user:", error);
    // return res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const addFirewall = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, supplier, code, flightNumber, flightSequence, from, to } =
    req.body;

  try {
    const firewall = await prisma.firewall.create({
      data: {
        title: title,
        supplier: supplier,
        code: code,
        flightNumber: flightNumber,
        flightSequence: flightSequence,
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getFirewall = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteFirewall = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addCommission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { type, commissionTitle, supplier, commissionFees, feeType } = req.body;

  try {
    const existingCommission = await prisma.commissionManagement.findFirst({
      where: {
        supplier: supplier,
        feeType: feeType,
        type: type,
      },
    });
    if (existingCommission) {
      throw new HttpError("Invalid Request", 400);
    }
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
    console.log(error);
    if (error instanceof HttpError) {
      next(error);
    }
    next(handlePrismaError(error));
  }
};

export const getCommission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getCommissionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateCommision = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteCommision = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getRolesById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    const user = await prisma.admin.create({
      data: {
        email: email,
        password: hashedPassword,
        firstname: name.split(" ")[0],
        lastname: name.split(" ")[1],
        role: "ADMIN",
      },
    });
    let createAdminUser

    if (user) {
       createAdminUser = await prisma.userManagement.create({
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
          adminId: user.id,
        },
      });

      if (createAdminUser) {
        res.status(200).json({
          message: "User created",
          user: user,
          createAdminUser: createAdminUser,
          success: true,
        });
      } else {
        res.status(404).json({ error: "User not created" });
      }
    } else {
      res.status(404).json({ error: "User not created" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getTicketById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addCookie = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getCookies = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getCookieById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateCookie = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteCookie = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addSocials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getSocials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getSocialById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateSocial = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteSocials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addPrivacy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { isEnabled, content, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";

  try {
    const privacy = await prisma.privacyPolicy.create({
      data: {
        isEnabled: isEnabled,
        content: content,
        language: lang,
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getPrivacy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const privacy = await prisma.privacyPolicy.findMany({
      where: { language: lang },
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getPrivacyById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const privacy = await prisma.privacyPolicy.findFirst({
      where: {
        id: id,
        language: lang,
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updatePrivacy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id, isEnabled, content, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const updatedPrivacy = await prisma.privacyPolicy.update({
      where: {
        id: id,
      },
      data: {
        isEnabled: isEnabled,
        content: content,
        language: lang,
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deletePrivacy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addTerms = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { isEnabled, content, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";

  try {
    const terms = await prisma.termsAndCondition.create({
      data: {
        isEnabled: isEnabled,
        content: content,
        language: lang,
      },
    });

    if (terms) {
      res.status(200).json({
        message: "Terms added",
        terms: terms,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Terms not created" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getTerms = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const terms = await prisma.termsAndCondition.findMany({
      where: { language: lang },
    });

    if (terms) {
      res.status(200).json({
        message: "Terms fetched",
        terms: terms,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Terms not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getTermById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const terms = await prisma.termsAndCondition.findFirst({
      where: {
        id: id,
        language: lang,
      },
    });

    if (terms) {
      res.status(200).json({
        message: "Terms fetched",
        terms: terms,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Terms not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateTerm = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id, isEnabled, content, language } = req.body;
  const lang = language && ["EN", "ES"].includes(language) ? language : "EN";
  try {
    const updatedTerms = await prisma.termsAndCondition.update({
      where: {
        id: id,
      },
      data: {
        isEnabled: isEnabled,
        content: content,
        language: lang,
      },
    });

    if (updatedTerms) {
      res.status(200).json({
        message: "Terms updated",
        terms: updatedTerms,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Terms not updated" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteTerm = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;

  try {
    const terms = await prisma.termsAndCondition.delete({
      where: {
        id: id,
      },
    });

    if (terms) {
      res.status(200).json({
        message: "Terms deleted",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Terms not deleted" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addEmailSMTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getEmailSMTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getEmailSMTPById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateEmailSMTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteEmailSMTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const createDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deal = await prisma.deals.create({
      data: req.body,
    });
    res.status(201).json(deal);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getDeals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deals = await prisma.deals.findMany();
    res.status(200).json(deals);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getDealById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getDealByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...data } = req.body;
  try {
    const deal = await prisma.deals.update({
      where: { id },
      data: data,
    });
    res.status(200).json(deal);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;
  try {
    const deal = await prisma.deals.delete({
      where: { id },
    });
    res.status(200).json({ message: "Deal deleted", success: true });
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const addCommissionType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getCommissionTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getCommissionTypeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateCommissionType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteCommissionType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payment = await prisma.payment.create({
      data: req.body,
    });
    res.status(201).json(payment);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payments = await prisma.payment.findMany();
    res.status(200).json(payments);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...data } = req.body;
  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: data,
    });
    res.status(200).json(payment);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deletePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;
  try {
    const payment = await prisma.payment.delete({
      where: { id },
    });
    res.status(200).json({ message: "Payment deleted", success: true });
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const countTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const createSearchManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newEntry = await prisma.searchManagement.create({
      data: req.body,
    });
    res.status(201).json(newEntry);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

// Read/Search SearchManagement entries
export const getSearchManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const entries = await prisma.searchManagement.findMany();
    res.status(200).json(entries);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

// Update an existing SearchManagement entry
export const updateSearchManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...data } = req.body;
  try {
    const updatedEntry = await prisma.searchManagement.update({
      where: { id },
      data: data,
    });
    res.status(200).json(updatedEntry);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

// Delete a SearchManagement entry
export const deleteSearchManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;
  try {
    await prisma.searchManagement.delete({
      where: { id },
    });
    res
      .status(200)
      .json({ message: "SearchManagement entry deleted", success: true });
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    console.log("files", files);

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded." });
    }

    const imageUrls: string[] = [];

    for (const file of files) {
      const fileName = `vuelitos-${generateRandomId(5)}.jpeg`;
      const imageUrl = await uploadImage(file.buffer, fileName, file.mimetype);
      imageUrls.push(imageUrl);
    }
    console.log("imageUrls", imageUrls);

    return res.status(200).json({
      success: true,
      urls: imageUrls,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};

//blogs
export const createBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { mainImg, description, secondaryImg, secondaryDesc, language } =
      req.body;
    //  const file = req.file;
    // const fileName = `vuelitos-${generateRandomId(5)}.jpeg`;

    // const imageUrl = await uploadImage(file.buffer, fileName, file.mimetype);
    // console.log("imageUrl",imageUrl)

    const newEntry = await prisma.blog.create({
      data: {
        mainImg,
        description,
        secondaryImg,
        secondaryDesc,
        language,
      },
    });

    res.status(200).json(newEntry);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

// export const getBlogs = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const {language} = req.body;
//     const entries = await prisma.blog.findMany({
//       where: {
//         language: language, // ✅ OR simply `language` if key and value are same
//       },
//     });
//     res.status(200).json(entries);
//   } catch (error) {
//     console.log(error);
//     next(handlePrismaError(error));
//   }
// };

export const getBlogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { language } = req.body;

    console.log(language);

    const entries = await prisma.blog.findMany({
      where: {
        language: language || "EN", // ✅ OR simply `language` if key and value are same
      },
    });

    res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    next(handlePrismaError(error));
  }
};

export const getBlogById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    const entry = await prisma.blog.findUnique({
      where: { id },
    });
    if (entry) {
      res.status(200).json(entry);
    } else {
      res.status(404).json({ error: "Blog not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...data } = req.body;
  try {
    const updatedEntry = await prisma.blog.update({
      where: { id },
      data: data,
    });
    res.status(200).json(updatedEntry);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;
  try {
    await prisma.blog.delete({
      where: { id },
    });
    res.status(200).json({ message: "Blog deleted", success: true });
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const fetchBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await prisma.booking.findMany();

    if (!bookings) {
      res.status(404).json({ error: "Booking not found", success: false });
    }

    res.status(200).json({ data: bookings, success: true });
  } catch (error) {
    console.error("Error fetching booking:", error);
    next(handlePrismaError(error));
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.body;

  try {
    await prisma.booking.delete({
      where: { id: id },
    });

    res.status(200).json({ message: "Booking deleted", success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    next(handlePrismaError(error));
    // return res
    //   .status(500)
    //   .json({ error: "Failed to delete booking", success: false });
  }
};

export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...data } = req.body;

  try {
    const booking = await prisma.booking.update({
      where: { id: id },
      data: data,
    });

    res.status(200).json({ booking, success: true });
  } catch (error) {
    console.error("Error updating booking:", error);
    next(handlePrismaError(error));
    // return res
    //   .status(500)
    //   .json({ error: "Failed to update booking", success: false });
  }
};

export const addBaggageWeight = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {

    




    const { weight, type } = req.body;
    if (req.user.role !== "ADMIN") {
      throw new HttpError("Unauthorized", 403);
    }
    if (type !== BaggageType.CABIN && type !== BaggageType.CHECKED) {
      throw new HttpError("Invalid Baggage Type", 400);
    }
    if (!weight) {
      throw new HttpError("Weight is required", 400);
    }
    const updatedBaggage = await prisma.baggageWeight.create({
      data: { weight, type },
    });
    res.status(201).json(updatedBaggage);
  } catch (error) {
    next(error);
  }
};

export const upadteBaggageWeight = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {

    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.UPDATE
    // );        

    // if (!permission) {
    //   res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to update baggage weight",
    //   });
    // } 


    const { weight, type } = req.body;
    if (req.user.role !== "ADMIN") {
      throw new HttpError("Unauthorized", 403);
    }
    if (type !== BaggageType.CABIN && type !== BaggageType.CHECKED) {
      throw new HttpError("Invalid Baggage Type", 400);
    }
    const id = req.params.id;
    if (!id) {
      throw new HttpError("Invalid ID", 400);
    }

    const payload: any = {};
    if (weight) {
      payload.weight = weight;
    }
    if (type) {
      payload.type = type;
    }
    const updatedBaggage = await prisma.baggageWeight.update({
      where: { id },
      data: payload,
    });
    res.status(201).json(updatedBaggage);
  } catch (error) {
    next(error);
  }
};

export const getBaggageWeight = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.VIEW
    // );

    // if (!permission) {
    //   res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to view baggage weight",
    //   });
    // }

    const baggage = await prisma.baggageWeight.findMany();
    res.status(200).json(baggage);
  } catch (error) {
    next(error);
  }
};

// Create a new fare setting
export const createFareSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(req.body);
  try {


    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.CREATE
    // );    

    // if (!permission) {
    //   res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to create fare setting",
    //   });
    // }


    const {
      airlineCodes,
      fareCodes,
      refundable,
      changeable,
      gds,
      cabinBaggage,
      checkedBaggage,
    } = req.body;
    const newSetting = await prisma.fareSetting.create({
      data: {
        airlineCodes,
        fareCodes,
        refundable,
        changeable,
        gds,
        cabinBaggage,
        checkedBaggage,
      },
    });
    res.status(201).json(newSetting);
  } catch (error) {
    next(handlePrismaError(error));
    // res.status(500).json({ error: "Error creating fare setting", details: error.message });
  }
};

// Get all fare settings
export const getAllFareSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("getAllFareSettings");
    const settings = await prisma.fareSetting.findMany();
    res.json(settings);
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
    // res.status(500).json({ error: error });
  }
};

// Update a fare setting
export const updateFareSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.UPDATE
    // );  

    // if (!permission) {
    //   res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to update fare setting",
    //   });
    // }

    const {
      airlineCodes,
      fareCodes,
      refundable,
      changeable,
      gds,
      cabinBaggage,
      checkedBaggage,
    } = req.body;
    const updatedSetting = await prisma.fareSetting.update({
      where: { id },
      data: {
        airlineCodes,
        fareCodes,
        refundable,
        changeable,
        gds,
        cabinBaggage,
        checkedBaggage,
      },
    });
    res.json(updatedSetting);
  } catch (error) {
    next(handlePrismaError(error));
    // res.status(500).json({ error: "Error updating fare setting", details: error.message });
  }
};

// Delete a fare setting
export const deleteFareSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await prisma.fareSetting.delete({ where: { id } });
    res.json({ message: "Fare setting deleted successfully" });
  } catch (error) {
    next(handlePrismaError(error));
    // res.status(500).json({ error: "Error deleting fare setting", details: error.message });
  }
};

// Scraping Module Controllers
export const createScrapingModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    airlineName,
    packageName,
    cabinBaggage,
    checkedBaggage,
    handBaggage,
    otherDetails,
    price,
  } = req.body;

  try {

    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.CREATE
    // );  

    // if (!permission) {
    //   res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to create scraping module",
    //   });
    // }




    const scrapingModule = await prisma.scrapingModule.create({
      data: {
        airlineName,
        packageName,
        cabinBaggage,
        checkedBaggage,
        handBaggage,
        otherDetails,
        price: parseFloat(price),
      },
    });

    if (scrapingModule) {
      res.status(201).json({
        message: "Scraping module created successfully",
        scrapingModule,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Scraping module not created" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getAllScrapingModules = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {

    // const roleId = (req as any).user.roleId;

    // const permission = await checkPermission(
    //   roleId,
    //   resources.SETTINGS,
    //   actions.VIEW
    // );

    // if (!permission) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Insufficient permissions to view scraping modules",
    //   });
    // }

    const scrapingModules = await prisma.scrapingModule.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    if (scrapingModules) {
      res.status(200).json({
        message: "Scraping modules fetched successfully",
        scrapingModules,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Scraping modules not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const getScrapingModuleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const roleId = (req as any).user.roleId;

  const permission = await checkPermission(
    roleId,
    resources.SETTINGS,
    actions.VIEW
  );

  if (!permission) {
    res.status(401).json({
      success: false,
      message: "Insufficient permissions to view scraping module",
    });
  }



  try {
    const scrapingModule = await prisma.scrapingModule.findUnique({
      where: {
        id: id,
      },
    });

    if (scrapingModule) {
      res.status(200).json({
        message: "Scraping module fetched successfully",
        scrapingModule,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Scraping module not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const updateScrapingModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const roleId = (req as any).user.roleId;

  const permission = await checkPermission(
    roleId,
    resources.SETTINGS,
    actions.UPDATE
  );

  if (!permission) {
    res.status(401).json({
      success: false,
      message: "Insufficient permissions to update scraping module",
    });
  }


  const {
    airlineName,
    packageName,
    cabinBaggage,
    checkedBaggage,
    handBaggage,
    otherDetails,
    price,
  } = req.body;

  try {
    const updatedScrapingModule = await prisma.scrapingModule.update({
      where: {
        id: id,
      },
      data: {
        airlineName,
        packageName,
        cabinBaggage,
        checkedBaggage,
        handBaggage,
        otherDetails,
        price: price ? parseFloat(price) : undefined,
      },
    });

    if (updatedScrapingModule) {
      res.status(200).json({
        message: "Scraping module updated successfully",
        scrapingModule: updatedScrapingModule,
        success: true,
      });
    } else {
      res.status(404).json({ error: "Scraping module not updated" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};

export const deleteScrapingModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  // const roleId = (req as any).user.roleId;

  // const permission = await checkPermission(
  //   roleId,
  //   resources.SETTINGS,
  //   actions.CREATE
  // );
  // if (!permission) {
  //   res.status(401).json({
  //     success: false,
  //     message: "Insufficient permissions to delete scraping module",
  //   });
  // }

  try {
    const deletedScrapingModule = await prisma.scrapingModule.delete({
      where: {
        id: id,
      },
    });

    if (deletedScrapingModule) {
      res.status(200).json({
        message: "Scraping module deleted successfully",
        success: true,
      });
    } else {
      res.status(404).json({ error: "Scraping module not found" });
    }
  } catch (error) {
    console.log(error);
    next(handlePrismaError(error));
  }
};
