import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";
import HttpError from "../utils/httperror";

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
  const { title, description, permissionGroups } = req.body;

  try {
    const roles = await prisma.role.create({
      data: {
        name: title,
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
    const roles = prisma.role.update({
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

  try {
    const roles = prisma.role.delete({
      where: {
        id: id,
      },
    });

    if (roles) {
      res.status(200).json({
        message: "Roles deleted",
        roles: roles,
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
  const { name, address, email, password, role, status } = req.body;

  try {
    const user = await prisma.userManagement.create({
      data: {
        name: name,
        address: address,
        email: email,
        password: password,
        role: role,
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
  const data = req.body;

  try {
    const updatedUser = await prisma.userManagement.update({
      where: {
        id: data.id,
      },
      data: data,
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