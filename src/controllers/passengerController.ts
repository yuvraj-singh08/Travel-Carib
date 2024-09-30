import { Request, Response } from 'express';
import { AddPassengerInput} from '../../types/userTypes';
// import {Passenger} from '../../models/passengerModel';
import Passenger from '../../models/passengerModel';

export const addPassenger = async (req: Request, res: Response): Promise<Response> => {
    try {
      const passengerData: AddPassengerInput = req.body; 
  
      const newPassenger = new Passenger({
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
        //@ts-ignore
        user: req.use_id, // Assuming `userId` is an ObjectId reference
      });

     const savedPassenger = await newPassenger.save(); // Save the new passenger to the database

    return res.status(201).json(savedPassenger);
  } catch (error) {
    console.error('Error adding passenger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePassenger = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const passengerData = req.body;
    

    const updatedPassenger = await Passenger.findByIdAndUpdate(id,{
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
    },
    { new: true } 
  );

  if (!updatedPassenger) {
    return res.status(404).json({ error: 'Passenger not found' });
  }

  return res.status(200).json(updatedPassenger);
} catch (error) {
  console.error('Error updating passenger:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
};

export const deletePassenger = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const deletedPassenger = await Passenger.findByIdAndDelete(id);

    if (!deletedPassenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    return res.status(204).json({ message: 'Passenger deleted successfully' });
  } catch (error) {
    console.error('Error deleting passenger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
