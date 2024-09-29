import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";

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

export const updateCommision = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, commissionTitle, supplier, commissionFees, feeType } = req.body;

  try {
    const commission = prisma.commissionManagement.update({
      where: {
        id: id,
      },
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
  const { id } = req.params;

  try {
    const commission = prisma.commissionManagement.delete({
      where: {
        id: id,
      },
    });

    if (commission) {
      res.status(200).json({
        message: "Commission deleted",
        commission: commission,
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
