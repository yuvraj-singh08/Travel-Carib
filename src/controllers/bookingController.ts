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

    const formattedBookings = bookings.map((booking: any) => {
      const firstSegment = booking.flightDetails[0].slices[0].segments[0];
      const secondSegment = booking.flightDetails[0].slices[0].segments[1];

      return {
        booking: {
          from: firstSegment.origin.iata_code,
          to: secondSegment.destination.iata_code,
          status: adminStatus[booking.adminStatus],
          type: booking.flight_type,
          bookingId: booking.flightDetails[0].responseId,
        },
        departure: {
          date: new Date(firstSegment.departing_at).toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              day: "2-digit",
              month: "short",
            }
          ),
          departureTime: new Date(firstSegment.departing_at).toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }
          ),
          arrivalTime: new Date(firstSegment.arriving_at).toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }
          ),
          from: {
            code: firstSegment.origin.iata_code,
            city: firstSegment.origin.iata_code,
          },
          to: {
            code: booking.flightDetails[0].slices[0].segments[
              booking.flightDetails[0].slices[0].segments.length - 1
            ].destination.iata_code,
            city: booking.flightDetails[0].slices[0].segments[
              booking.flightDetails[0].slices[0].segments.length - 1
            ].destination.iata_code,
          },
          flightNumbers: [
            `${firstSegment.operating_carrier.iata_code} ${firstSegment.operating_carrier_flight_number}`,
            `${secondSegment.operating_carrier.iata_code} ${secondSegment.operating_carrier_flight_number}`,
          ],
          passenger: `${booking.passenger[0].firstName} ${booking.passenger[0].surname}`,
          pnr: booking.flightDetails[0].responseId.substring(0, 6),
        },
        pricing: {
          baseFare: {
            adult: {
              count: 1,
              price: booking.totalAmount,
            },
          },
          taxes: {
            airlineTaxes: 0,
            serviceFee: 0,
          },
          otherServices: {
            charity: 0,
          },
          totalRefund: booking.totalAmount,
        },
        userId: booking.userId,
      };
    });

    return res.status(200).json({ bookings: formattedBookings, success: true });
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
