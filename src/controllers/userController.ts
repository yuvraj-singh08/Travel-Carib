import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import CoTraveller from "../../models/coTravellersSchema";
import User from "../../models/userModel";
import { CoTravellersInput } from "../../types/userTypes";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const SALT_ROUNDS = 10;

// Register User
export const registerUser = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const response = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        firstname: firstName,
        lastname: lastName,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user: response,
      success: true,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to create user", success: false });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token, user });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const updateUserProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  const {
    password,
    mobileNumber,
    gender,
    dateOfBirth,
    address,
    profilePhoto,
    firstName,
    lastName,
    pincode,
  } = req.body;

  try {
    const updates: any = {};

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    if (mobileNumber) updates.mobileNumber = mobileNumber;
    if (gender) updates.gender = gender;
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
    if (address) updates.address = address;
    if (profilePhoto) updates.profilePhoto = profilePhoto;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (pincode) updates.pincode = pincode;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updates,
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ error: "Failed to update user profile" });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true });
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const addCoTraveller = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const TravellerData: CoTravellersInput = req.body;
  const userId = req.user?.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newCoTraveller = new CoTraveller({
      userId: TravellerData.userId,
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
    return res
      .status(500)
      .json({ message: "Error adding co-traveller", error });
  }
};
