import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { AuthenticatedRequest } from "../../types/express";

export const addBooking = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const booking = await prisma.booking.create({
      data: data,
      
    });


    const discount = await prisma.deals.findUnique({
      where: {
        code: data.discount?.code,
      },
    });

    if (discount) {
      let used = discount.used + 1;

      await prisma.deals.update({
        where: {
          code: data.discount?.code,
        },
        data: {
          used: used,
          userId: [data.userId],
        },
      });

      return res.json({
        message: "Booking confirmed and discount applied",
        booking: booking,
        success: true,
      });
    }

    return res.status(200).json({
      message: "Booking confirmed",
      booking: booking,
      success: true,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to create booking", success: false });
  }
};
