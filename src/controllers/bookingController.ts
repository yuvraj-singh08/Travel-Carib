import { NextFunction, Request, Response } from "express";
import { prisma } from "../prismaClient";
import { AuthenticatedRequest } from "../../types/express";
import { AdminStatus } from "@prisma/client";
import HttpError from "../utils/httperror";
import { updateSubBookingService } from "../services/Booking.service";

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

export const getPaymentDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new HttpError("Invalid Payment ID", 400);
    }
    const payment = await prisma.bookPayment.findFirst({ where: { id } });
    if (!payment) {
      throw new HttpError("Payment not found", 404);
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      res
        .status(403)
        .json({ error: "Unauthorized access", success: false });
      return;
    }
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
      },
    })
    const parsedBooking = bookings.map((booking) => {
      return {
        ...booking,
        passenger: JSON.parse(booking.passenger),
        flightDetails: JSON.parse(booking.flightDetails),
      }
    })
    res.status(200).json({ success: true, data: parsedBooking });
  } catch (error) {
    next(error);
  }
}

export const getBookingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      throw new HttpError("Unauthorized access", 403);
    }

    const { id } = req.params;
    if (!id) {
      throw new HttpError("Invalid booking ID", 400);
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id
      },
      include: {
        SubBooking: true, // Fetch all associated SubBooking records
      },
    });
    res.status(200).json({ success: true, data: { ...booking, flightDetails: JSON.parse(booking.flightDetails) } });
  } catch (error) {
    next(error);
  }
}


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

  const {
    to,
    from,
    pageIndex = 0,
    pageSize = 10,
    searchKey,
    status,

  }: {
    to: string,
    from: string,
    pageIndex?: number;
    pageSize?: number;
    searchKey?: string;
    status: string
  } = req.body;

  if (pageSize <= 0 || pageIndex < 0) {
    return res.status(400).json({
      error: "Invalid pagination parameters",
      success: false,
    });
  }



  try {
    const whereClause: any = req.user.role === "ADMIN" ? {} : { userId };

    if (to != undefined && from != undefined) {
      const fromDate = new Date(from);
      const toDate = new Date(to)
      whereClause.
        createdAt = {
        gte: fromDate,
        lte: toDate,
      };

    }
    if (status) {
      whereClause.adminStatus = status;
    }

    if (searchKey) {
      whereClause.OR = [
        {
          id: {
            contains: searchKey,
            mode: 'insensitive',
          }
        },
      ];
    }

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where: whereClause,
        skip: pageIndex * pageSize,
        take: pageSize,
      }),
      prisma.booking.count({ where: whereClause }),
    ]);

    if (!bookings) {
      return res
        .status(404)
        .json({ error: "Booking not found", success: false });
    }


    // const updatedData = bookings.map((booking) => {
    //   let status = booking.adminStatus;

    //   if (status === "PENDING_TICKET") {
    //     status = adminStatus.PENDING_TICKET as AdminStatus;
    //   } else if (status === "PENDING_PAYMENT") {
    //     status = adminStatus.PENDING_PAYMENT as AdminStatus;
    //   } else if (status === "EXPIRED") {
    //     status = adminStatus.EXPIRED as AdminStatus;
    //   } else if (status === "FAILED_BOOKING") {
    //     status = adminStatus.FAILED_BOOKING as AdminStatus;
    //   } else {
    //     status = adminStatus.TICKETED as AdminStatus;
    //   }

    //   return {
    //     ...booking,
    //     adminStatus: status,
    //   };
    // });

    return res.status(200).json({ data: bookings, total: total, success: true });
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


export const updateSubBookingController = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, ticket } = req.body;
    const { id } = req.params;
    if (!id) {
      throw new HttpError("Invalid SubBooking ID", 400);
    }
    const updatedBooking = await updateSubBookingService({ status, ticket, id });
    res.status(201).json({ success: true, data: updatedBooking });
  } catch (error) {
    next(error);
  }
}