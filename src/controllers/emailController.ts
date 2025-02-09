import { NextFunction, Request, Response } from "express";
import HttpError from "../utils/httperror";
import { getOffer } from "../services/OfferService";
import { prisma } from "../prismaClient";
import { sendEmail } from "../services/emailService";
import { generateNewPdf } from "../services/pdfService";

export const emailSend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("called")
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

export const ticketDownload = async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      
    const booking = await prisma.booking.findFirst({
        where: {
          id:bookingId
        }
      });
      console.log("booking",booking);
     
      const newPdfBuffer = await generateNewPdf({ ...booking, flightDetails: JSON.parse(booking.flightDetails)});
  
      // Set proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${bookingId}.pdf`);
      res.setHeader('Content-Length', newPdfBuffer.length);
  
      // Send the buffer directly
      res.end(newPdfBuffer);
    } catch (error) {
      console.error('PDF download error:', error);
      res.status(500).send('Error generating PDF ticket');
      
    }
  };