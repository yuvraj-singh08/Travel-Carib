import { Request, Response } from "express";
import { prisma } from "../prismaClient";

export const addPassenger = async (req, res) => {
  try {
    const data = req.body;

    const passenger = await prisma.passenger.create({
      data: data,
    });

    if (passenger)
      return res.status(200).json({
        message: "Passenger added successfully",
        passenger: passenger,
      });
  } catch (error) {
    console.error("Error adding passenger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePassenger = async (req: Request, res: Response) => {
  try {
    const { id, ...data } = req.body;

    const updatedPassenger = await prisma.passenger.update({
      where: {
        id: id,
      },
      data: data,
    });

    if (!updatedPassenger) {
      return res.status(404).json({ error: "Passenger not found" });
    }

    return res.status(200).json({ updatedPassenger: updatedPassenger });
  } catch (error) {
    console.error("Error updating passenger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePassenger = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    const deletedPassenger = await prisma.passenger.delete({
      where: {
        id: id,
      },
    });

    if (!deletedPassenger) {
      return res.status(404).json({ error: "Passenger not found" });
    }

    return res.status(200).json({ message: "Passenger deleted successfully" });
  } catch (error) {
    console.error("Error deleting passenger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
