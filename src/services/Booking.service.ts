import { CreateBookingServiceParams, UpdateSubBookingType } from "../../types/flightTypes";
import { prisma } from "../prismaClient";

export const createBookingService = async (params: CreateBookingServiceParams) => {
    try {
        let totalAmount = params.flightData.total_amount;
        let count = 0, adult = 0, children = 0, infant = 0;
        params.passengers.forEach((passenger) => {
            if (passenger.type === "adult") {
                adult++;
            } else if (passenger.type === "child") {
                children++;
            } else {
                infant++;
            }
            passenger.baggageDetails?.forEach((baggage) => {
                totalAmount += baggage.price;
                count++;
            })
        })

        const booking = await prisma.booking.create({
            data: {
                contactDetail: {
                    email: params.contactDetails.email,
                    phone: params.contactDetails.phone,
                },
                flightDetails: JSON.stringify(params.flightData),
                passenger: JSON.stringify(params.passengers),
                baseFare: params.flightData.total_amount,
                fareSummary: {
                    adults: adult,
                    children: children,
                    infants: infant,
                    extra_luggage: count,
                },
                totalAmount,
                currency: "USD",
                flight_type: params.flightType,
                adminStatus: "PENDING_PAYMENT",
                userId: params.userId,
            },
        });
        const subBookings = await Promise.all(params.subBookings.map((subBooking) => {
            return prisma.subBooking.create({
                data: {
                    bookingId: booking.id,
                    pnr: subBooking.pnr,
                    status: subBooking.status,
                    supplier: subBooking.supplier
                },
            })
        }))



        const payment = await prisma.bookPayment.create({
            data: {
                bookingId: booking.id,
                totalAmount,
                currency: "USD",
                paymentType: "",
            },
        });


        return ({
            message: "Booking confirmed",
            booking: booking.id,
            payment: payment.id,
            success: true,
        });
    } catch (error) {
        throw error;
    }
}

export const updateSubBookingService = async (params: UpdateSubBookingType) => {
    try {
        const payload = {};
        if (params.status) {
            payload['status'] = params.status;
        }
        if (params.ticket) {
            payload['ticket'] = params.ticket;
        }
        const updatedBooking = await prisma.subBooking.update({
            where: {
                id: params.id,
            },
            data: payload
        });
        return updatedBooking;
    } catch (error) {
        throw error;
    }
}