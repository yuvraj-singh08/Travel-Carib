// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { CreateUserInput, UpdateUserInput } from '../../types/userTypes';


// const prisma = new PrismaClient();

// export const createUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const data: CreateUserInput = req.body;
//     const newUser = await prisma.user.create({
//       data: {
//         ...data,
//         address: data.address
//           ? {
//               create: data.address,
//             }
//           : undefined,
//       },
//     });
//     res.status(201).json(newUser);
//   } catch (error) {
//     res.status(400).json({ error: 'Error creating user', details: error.message });
//   }
// };

// export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const users = await prisma.user.findMany();
//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ error: 'Error fetching users', details: error.message });
//   }
// };

// export const getUserById = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.params.id;
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       res.status(404).json({ error: 'User not found' });
//       return;
//     }

//     res.status(200).json(user);
//   } catch (error) {
//     res.status(500).json({ error: 'Error fetching user', details: error.message });
//   }
// };

// export const updateUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.params.id;
//     const data: UpdateUserInput = req.body;

//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: {
//         ...data,
//         address: data.address
//           ? {
//               update: data.address,
//             }
//           : undefined,
//       },
//     });

//     res.status(200).json(updatedUser);
//   } catch (error) {
//     res.status(400).json({ error: 'Error updating user', details: error.message });
//   }
// };

// export const deleteUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.params.id;
//     await prisma.address.deleteMany({
//         where: {
//           userId: userId,
//         },
//       });
//       await prisma.user.delete({
//         where: { id: userId },
//       });
  
//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ error: 'Error deleting user', details: error.message });
//   }
// };





import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { CreateUserInput, PassportDetailInput, FrequentFlyerDetailInput, CoTravellersInput } from "../../types/userTypes"; 

const prisma = new PrismaClient();

export const createUser = async (req: Request<{}, {}, CreateUserInput>, res: Response) => {
  const { email, password, mobileNumber, fullName, nickName, gender, dateOfBirth, pinCode, address, profilePhoto } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password,
        mobileNumber,
        fullName,
        nickName,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        pinCode,
        address,
        profilePhoto,
      },
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
};


// export const createCoTraveller = async (req: Request<{}, {}, CoTravellersInput>, res: Response) => {
//   const { userId, name, dateOfBirth, passportNumber, phoneNumber } = req.body;

//   try {
//     const coTraveller = await prisma.coTravellers.create({
//       data: {
//         userId,
//         name,
//         dateOfBirth: new Date(dateOfBirth), 
//         passportNumber,
//         phoneNumber,
//       },
//     });

//     res.status(201).json(coTraveller);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to create co-traveller" });
//   }
// };

export const addPassportDetail = async (req: Request<{}, {}, PassportDetailInput>, res: Response) => {
  const { userId, passportNumber, issuingCountry, expiryDate, passportImage } = req.body;
  try {
    const passportDetail = await prisma.passportDetail.create({
      data: {
        userId,
        passportNumber,
        issuingCountry,
        expiryDate: new Date(expiryDate),
        passportImage,
      },
    });
    res.json(passportDetail);
  } catch (error) {
    res.status(500).json({ error: "Failed to add passport detail" });
  }
};

export const addFrequentFlyerDetail = async (req: Request<{}, {}, FrequentFlyerDetailInput>, res: Response) => {
  const { userId, frequentFlyerNumber, airline } = req.body;
  try {
    const frequentFlyerDetail = await prisma.frequentFlyerDetail.create({
      data: {
        userId,
        frequentFlyerNumber,
        airline,
      },
    });
    res.json(frequentFlyerDetail);
  } catch (error) {
    res.status(500).json({ error: "Failed to add frequent flyer detail" });
  }
};
