import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";
import { coTravellerSchema } from "../schemas/CoTraveller.schema";
import { addCoTravelerService, deleteCotravellerService, updateCoTravelerService } from "../services/CoTraveler.service";
import HttpError from "../utils/httperror";

// Add CoTraveller
export const addCoTraveller = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError("UserId not found", 404);
  }

  try {
    const { travellerData } = req.body;
    if (!travellerData) {
      throw new HttpError("No Traveller Data Provided", 400);
    }
    const validatedData = coTravellerSchema.parse(travellerData);
    //@ts-ignore
    const newTraveller = await addCoTravelerService(userId, validatedData);
    res.status(201).json({ success: true, data: newTraveller })
  } catch (error) {
    next(error);
  }
};

export const updateCoTraveller = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpError("UserId not found", 404);
    }
    const { id,...travellerData } = req.body.travellerData;
    console.log(id);
    console.log(travellerData);
    delete travellerData.id;
    const validatedData = coTravellerSchema.parse(travellerData);
    const updatedCoTraveller = await updateCoTravelerService(id, travellerData);
    res.status(200).json({ success: true, data: updatedCoTraveller });

  } catch (error) {
    next(error);
  }
}

export const getCoTravellers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpError("UserId not found", 404);
    }
    const coTravellers = await prisma.coTraveler.findMany({ where: { userId } });
    res.status(200).json({ success: true, data: coTravellers });
  } catch (error) {
    next(error);
  }
}


export const getCoTravellersById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    if (!userId) {
      throw new HttpError("UserId not found", 404);
    }
    const coTravellers = await prisma.coTraveler.findMany({ where: { userId ,id:id} });
    res.status(200).json({ success: true, data: coTravellers });
  } catch (error) {
    next(error);
  }
}

export const getCoTravellerByPassport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { passportNumber } = req.params;
    const coTraveller = await prisma.coTraveler.findFirst({ where: { passportNo: passportNumber } });
    res.status(200).json({ success: true, data: coTraveller });
  } catch (error) {
    next(error);
  }
}

export const deleteCoTraveller = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCotravellerService(id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    next(error);
  }
}
