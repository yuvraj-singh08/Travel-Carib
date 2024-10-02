import { Request, Response } from "express";
import CoTraveller from "../../models/coTravellersSchema";
import User from "../../models/userModel";
import PassportDetail from "../../models/passportDetailModel";
import {
  CoTravellersInput,
  FrequentFlyerDetailInput,
} from "../../types/userTypes";
import { PassportDetailInput } from "../../types/userTypes";
import { AuthenticatedRequest } from "../../types/express";
import Flyer from "../../models/FlyerDetailModel";
import { prisma } from "../prismaClient";

// Add CoTraveller
export const addCoTraveller = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const TravellerData: CoTravellersInput = req.body;
  const userId = req.user?.id;

  try {
    const user = await prisma.coTraveler.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newCoTraveller = await prisma.coTraveler.create({
      data: {
        name: TravellerData.name,
        dob: TravellerData.dob,
        email: TravellerData.email,
        passportNo: TravellerData.passportNo,
        phoneNumber: TravellerData.phoneNumber,
      },
    });

    return res
      .status(201)
      .json({
        message: "Co-traveller created",
        newCoTraveller: newCoTraveller,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error adding co-traveller", error });
  }
};

// Update passport detail
export const UpdatePassportDetail = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const PassportData: PassportDetailInput = req.body;
  const userId = req.user?.id;
  try {
    // const passportDetail = await PassportDetail.findOne({ userId });
    const newPassportDetail = new PassportDetail({
      userId: userId,
      passportNumber: PassportData.passportNumber,
      issuingCountry: PassportData.issuingCountry,
      expiryDate: PassportData.expiryDate,
      passportImage: PassportData.passportImage,

      //@ts-ignore
      //   user: req.user?_id
    });

    await newPassportDetail.save();
    return res.status(201).json(newPassportDetail);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating passport details", error });
  }
};

// Delete CoTraveller
// export const deleteCoTraveller = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   try {
//     const coTraveller = await CoTraveller.findById(id);

//     if (!coTraveller) {
//       return res.status(404).json({ message: 'CoTraveller not found' });
//     }

//     await coTraveller.remove();
//     return res.status(200).json({ message: 'CoTraveller deleted successfully' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Error deleting co-traveller', error });
//   }
// };

//Add Frequent flyer Details
export const AddFrequentFlyer = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const FlyerData: FrequentFlyerDetailInput = req.body;
  const userId = req.user?.id;
  try {
    const newFlyer = new Flyer({
      userId: userId,
      frequentFlyerNumber: FlyerData.frequentFlyerNumber,
      airlines: FlyerData.airlines,
    });
    await newFlyer.save();
    return res.status(201).json(newFlyer);
  } catch (error) {
    return res.status(500).json({ message: "Error adding new flyer", error });
  }
};
