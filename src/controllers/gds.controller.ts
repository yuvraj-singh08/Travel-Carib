import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import HttpError from "../utils/httperror";
import { getAllGdsCredsService, updateGdsCredsService } from "../services/GdsCreds.service";

export const updateGdsCreds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        if (!data.gds) {
            throw new HttpError("Please specify gds", 400);
        }

        const updatedData = await updateGdsCredsService(data);
        res.status(201).json({
            success: true,
            message: "GDS credentials updated successfully",
            data: updatedData,
        });
    } catch (error) {
        next(error);
    }
}

export const getGdsCreds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await getAllGdsCredsService();
        res.status(201).json({
            success: true,
            message: "GDS credentials fetched successfully",
            data: data,
        });
    } catch (error) {
        next(error);
    }
}