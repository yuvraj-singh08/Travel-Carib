import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { AuthenticatedRequest } from "../../types/express";

const adminStatus = {
  TICKETED: "Confirmed",
  PENDING_TICKET: "Pending",
  PENDING_PAYMENT: "Pending",
  EXPIRED: "Cancelled",
  FAILED_BOOKING: "Cancelled",
};

export const addBooking = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  const data = req.body;

  try {
    const booking = await prisma.booking.create({
      data: {
        ...data,
        adminStatus: adminStatus[data.adminStatus],
        userId: userId,
      },
    });

    const payment = await prisma.bookPayment.create({
      data: {
        bookingId: booking.id,
        totalAmount: data.pricing.totalRefund,
        currency: "USD",
        paymentType: "",
      },
    });

    let discount;

    // const discountData =
    //   typeof booking.discount === "string"
    //     ? JSON.parse(booking.discount)
    //     : booking.discount;
    // if (discountData?.code) {
    //   discount = await prisma.deals.findUnique({
    //     where: {
    //       code: data.discount?.code,
    //     },
    //   });
    // }

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
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  try {
    const booking = await prisma.booking.findMany({
      where: {
        userId: userId,
      },
    });

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

export const deleteBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

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

export const updateBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  const { id, ...data } = req.body;

  try {
    const booking = await prisma.booking.update({
      where: { id: id },
      data: {
        ...data,
        adminStatus: adminStatus[data.adminStatus],
        userId: userId,
      },
    });

    return res.status(200).json({ booking, success: true });
  } catch (error) {
    console.error("Error updating booking:", error);
    return res
      .status(500)
      .json({ error: "Failed to update booking", success: false });
  }
};
