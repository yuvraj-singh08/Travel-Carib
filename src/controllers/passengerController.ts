import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AddPassengerInput} from '../../types/userTypes';
const prisma = new PrismaClient();
export const addPassenger = async (req: Request, res: Response): Promise<Response> => {
    try {
      const passengerData: AddPassengerInput = req.body; 
  
      const newPassenger = await prisma.passenger.create({
        data: {
          firstName: passengerData.firstName,
          surname: passengerData.surname,
          nationality: passengerData.nationality,
          gender: passengerData.gender,
          dateOfBirth: new Date(passengerData.dateOfBirth), 
          passportNumber: passengerData.passportNumber,
          passportExpiry: new Date(passengerData.passportExpiry),
          country: passengerData.country,
          state: passengerData.state,
          city: passengerData.city,
          zipCode: passengerData.zipCode,
          address: passengerData.address,
          identityCard: passengerData.identityCard,
          user: { connect: { id: passengerData.userId } }, 
        },
      });
  
      return res.status(201).json(newPassenger);
    } catch (error) {
      console.error('Error adding passenger:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

export const updatePassenger = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const {
      firstName,
      surname,
      nationality,
      gender,
      dateOfBirth,
      passportNumber,
      passportExpiry,
      country,
      state,
      city,
      zipCode,
      address,
      identityCard,
    } = req.body;

    const updatedPassenger = await prisma.passenger.update({
      where: { id },
      data: {
        firstName,
        surname,
        nationality,
        gender,
        dateOfBirth: new Date(dateOfBirth), 
        passportNumber,
        passportExpiry: new Date(passportExpiry),
        country,
        state,
        city,
        zipCode,
        address,
        identityCard,
      },
    });

    return res.status(200).json(updatedPassenger);
  } catch (error) {
    console.error('Error updating passenger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePassenger = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
  
      await prisma.passenger.delete({
        where: { id },
      });
  
      return res.status(204).json({ message: 'Passenger deleted successfully' });
    } catch (error) {
      console.error('Error deleting passenger:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
