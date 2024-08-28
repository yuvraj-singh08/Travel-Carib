import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateUserInput, UpdateUserInput } from '../../types/userTypes';


const prisma = new PrismaClient();

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateUserInput = req.body;
    const newUser = await prisma.user.create({
      data: {
        ...data,
        address: data.address
          ? {
              create: data.address,
            }
          : undefined,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Error creating user', details: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user', details: error.message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const data: UpdateUserInput = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        address: data.address
          ? {
              update: data.address,
            }
          : undefined,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Error updating user', details: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    await prisma.address.deleteMany({
        where: {
          userId: userId,
        },
      });
      await prisma.user.delete({
        where: { id: userId },
      });
  
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};
