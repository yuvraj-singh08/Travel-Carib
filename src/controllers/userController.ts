// src/controllers/userController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const SALT_ROUNDS = 10; 

export const registerUser = async (req: Request, res: Response) => {
  const { email, password, mobileNumber, gender, dateOfBirth, address, profilePhoto, fullName, nickName, pinCode } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,  
        mobileNumber,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        address,
        profilePhoto,
        fullName,
        nickName,
        pinCode,
      },
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to login' });
  }
};


// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  const { email, password, mobileNumber, gender, dateOfBirth, address, profilePhoto, fullName, nickName, pinCode } = req.body;
  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        password,
        mobileNumber,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        address,
        profilePhoto,
        fullName,
        nickName,
        pinCode,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
