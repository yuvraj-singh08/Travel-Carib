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
      res
        .status(200)
        .json({
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
