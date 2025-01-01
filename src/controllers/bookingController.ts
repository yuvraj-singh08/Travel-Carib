import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { AuthenticatedRequest } from "../../types/express";
import { AdminStatus } from "@prisma/client";

const adminStatus = {
  TICKETED: "Confirmed",
  PENDING_TICKET: "Pending",
  PENDING_PAYMENT: "Pending",
  EXPIRED: "Cancelled",
  FAILED_BOOKING: "Cancelled",
};

export const addBooking = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  if (!userId) {
    return res
      .status(403)
      .json({ error: "Unauthorized access", success: false });
  }

  const data = req.body;
  data.userId = userId;

  try {
    const booking = await prisma.booking.create({
      data: data,
    });

    const payment = await prisma.bookPayment.create({
      data: {
        bookingId: booking.id,
        totalAmount: data.totalAmount,
        currency: data.currency,
        paymentType: "",
      },
    });

    let discount;

    const discountData =
      typeof booking.discount === "string"
        ? JSON.parse(booking.discount)
        : booking.discount;
    if (discountData?.code) {
      discount = await prisma.deals.findUnique({
        where: {
          code: data.discount?.code,
        },
      });
    }

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
      booking: booking.id,
      payment: payment.id,
      success: true,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to create booking", success: false });
  }
};

export const fetchBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user.id;

  if (!userId) {
    return res
      .status(403)
      .json({ error: "Unauthorized access", success: false });
  }

  try {
    const bookings = await prisma.booking.findMany();

    if (!bookings) {
      return res
        .status(404)
        .json({ error: "Booking not found", success: false });
    }

    const updatedData = bookings.map((booking) => {
      let status = booking.adminStatus;

      if (status === "PENDING_TICKET") {
        status = adminStatus.PENDING_TICKET as AdminStatus;
      } else if (status === "PENDING_PAYMENT") {
        status = adminStatus.PENDING_PAYMENT as AdminStatus;
      } else if (status === "EXPIRED") {
        status = adminStatus.EXPIRED as AdminStatus;
      } else if (status === "FAILED_BOOKING") {
        status = adminStatus.FAILED_BOOKING as AdminStatus;
      } else {
        status = adminStatus.TICKETED as AdminStatus;
      }

      return {
        ...booking,
        adminStatus: status,
      };
    });
    
    return res.status(200).json({ updatedData, success: true });
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
