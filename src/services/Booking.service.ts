import { CreateBookingServiceParams } from "../../types/flightTypes";
import { prisma } from "../prismaClient";

export const createBookingService = async (params: CreateBookingServiceParams) => {
    try {
        let totalAmount = params.flightData.total_amount;
        params.passengers.forEach((passenger) => {
            passenger.baggageDetails?.forEach((baggage) => {
                totalAmount += baggage.price;
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
                totalAmount,
                currency: "USD",
                flight_type: params.flightType,
                adminStatus: "PENDING_PAYMENT",
                userId: params.userId,
                tax_fee_surges: 50.0,
                otherCharges: 20.0,
            },
        });
        const subBookings = await Promise.all(params.subBookings.map((subBooking) => {
            return prisma.subBooking.create({
                data: {
                    bookingId: booking.id,
                    pnr: subBooking.pnr,
                    status: subBooking.status,
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