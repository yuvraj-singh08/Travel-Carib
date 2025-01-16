import { NextFunction, Request, Response } from "express";
import HttpError from "../utils/httperror";
import { getOffer } from "../services/OfferService";

export const getOfferController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new HttpError("ID not provided", 400);
        }
        const offer = await getOffer(id);
        res.status(200).json({ success: true, data: offer });
    } catch (error) {
        next(error);
    }
}