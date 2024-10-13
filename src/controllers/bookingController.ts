import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { AuthenticatedRequest } from "../../types/express";

export const addBooking = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const booking = await prisma.booking.create({
      data: data,
      
    });

    const payment = await prisma.bookPayment.create({
      data: {
        bookingId: booking.id,
        ...data,
        paymentDate: new Date(),
      },
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
        booking: booking.id,
        payment: payment.id,
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

export const fetchBooking = async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findMany();

    if (!booking) {
      return res
        .status(404)
        .json({ error: "Booking not found", success: false });
    }

    return res.status(200).json({ booking, success: true });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch booking", success: false });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    await prisma.booking.delete({
      where: { id: id },
    });

    return res.status(200).json({ message: "Booking deleted", success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete booking", success: false });
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  const { id, ...data } = req.body;

  try {
    const booking = await prisma.booking.update({
      where: { id: id },
      data: data,
    });

    return res.status(200).json({ booking, success: true });
  } catch (error) {
    console.error("Error updating booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to update booking", success: false });
  }
};
