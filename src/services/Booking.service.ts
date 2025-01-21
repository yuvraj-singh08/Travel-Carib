import { CreateBookingServiceParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient";

export const createBookingService = async (params: CreateBookingServiceParams) => {
    try {
        const booking = await prisma.booking.create({
            data: {
                contactDetail: {
                    create: {
                        email: params.contactDetails.email,
                        phone: params.contactDetails.phone,
                    },
                },
                subBooking: params.subBookings,
                flightDetails: JSON.stringify(params.flightData),
                passenger: params.passengers.map(passenger => JSON.stringify(passenger)),
                baseFare: params.flightData.total_amount,
                totalAmount: params.flightData.total_amount,
                currency: "USD",
                flight_type: params.flightType,
                adminStatus: "PENDING_PAYMENT",
                userId: params.userId,
                tax_fee_surges: 50.0,
                otherCharges: 20.0,
            },
        });

        const payment = await prisma.bookPayment.create({
            data: {
                bookingId: booking.id,
                totalAmount: params.flightData.total_amount,
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