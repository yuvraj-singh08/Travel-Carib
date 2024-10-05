import { Request, Response } from "express";
import { prisma } from "../prismaClient";

export const addBooking = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const booking = await prisma.booking.create({
      data: data,
    });

    if (data.discount?.code) {
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
          },
        });

        res.json({
          messgae: "Booking confirmed and discount applied",
          booking: booking,
        });
      }
    }

    res.json({ messgae: "Booking confirmed", booking: booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
};
