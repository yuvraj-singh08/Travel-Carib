import { NextFunction, Request, Response } from "express";
import HttpError from "../utils/httperror";
import { getOffer } from "../services/OfferService";
import { prisma } from "../prismaClient";
import { sendEmail } from "../services/emailService";

export const emailSend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            throw new HttpError("ID not provided", 400);
        }
        const booking = await prisma.booking.findFirst({
            where: {
              id:bookingId
            }
          });
        const data =  { ...booking, flightDetails: JSON.parse(booking.flightDetails) };
        const offer = await sendEmail(data);
        res.status(200).json({ success: true, data: offer });
    } catch (error) {
        next(error);
    }
}