import { Request, Response } from 'express';
import CoTraveller from '../../models/coTravellersSchema';
import User from '../../models/userModel';
import PassportDetail from '../../models/passportDetailModel';
import { CoTravellersInput } from '../../types/userTypes';
import { PassportDetailInput } from '../../types/userTypes';
import { AuthenticatedRequest } from '../../types/express';

// Add CoTraveller
export const addCoTraveller = async (req: AuthenticatedRequest, res: Response) => {
    const TravellerData: CoTravellersInput = req.body;
    const userId = req.user?.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newCoTraveller = new CoTraveller({
      userId : userId,
      name: TravellerData.name,
      email: TravellerData.email,
      dateOfBirth: TravellerData.dateOfBirth,
      passportNumber: TravellerData.passportNumber,
      phoneNumber: TravellerData.phoneNumber,
      //@ts-ignore
    //   user: req.user?_id
    });

    await newCoTraveller.save();
    return res.status(201).json(newCoTraveller);
  } catch (error) {
    return res.status(500).json({ message: 'Error adding co-traveller', error });
  }
};

// Add passport detail
export const UpdatePassportDetail = async(req: AuthenticatedRequest, res: Response) => {
    const PassportData: PassportDetailInput = req.body;
    const userId = req.user?.id;
    try {
       
        // const passportDetail = await PassportDetail.findOne({ userId });
        const newPassportDetail = new PassportDetail({
          userId : userId,
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
        return res.status(500).json({ message: 'Error updating passport details', error });
      }
}

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
