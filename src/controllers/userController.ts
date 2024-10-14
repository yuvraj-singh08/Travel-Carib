import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../../models/userModel";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const SALT_ROUNDS = 10;

// Register User
export const registerUser = async (req: Request, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    mobileNumber,
    dob,
    lastBooking,
    country,
    gender,
    pincode,
    avatarSrc,
    passportDetails,
    coTraveler,
    role,
    provider,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const response = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        firstname: firstName,
        lastname: lastName,
        mobileNumber: mobileNumber,
        dob: dob,
        role: role,
        lastBooking: lastBooking,
        country: country,
        gender: gender,
        pincode: pincode,
        avatarSrc: avatarSrc,
        passportDetails: passportDetails,
        coTraveler: coTraveler,
        provider: provider,
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

//Social Auth register
export const socialAuthRegister = async (req: Request, res: Response) => {
  const data = req.body;

  try {
    const response = await prisma.user.create({
      data: data,
    });

    res.status(200).json({
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

    let isPasswordValid: Boolean;

    if (password) {
      isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
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
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (user) {
      return res.json(user);
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
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
    avatarSrc,
    firstName,
    lastName,
    pincode,
    role,
  } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password,
        mobileNumber,
        gender,
        dob: dateOfBirth,
        address,
        role,
        avatarSrc,
        firstname: firstName,
        lastname: lastName,
        pincode,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ error: "Failed to update user profile" });
  }
};

// Update a user
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  const {
    firstName,
    lastName,
    mobileNumber,
    email,
    address,
    dob,
    lastBooking,
    country,
    gender,
    pincode,
    avatarSrc,
    password,
    passportDetails,
    coTraveler,
    frequentlyFlyer,
    role,
  } = req.body;

  let hashedPassword: string | undefined;
  if (password) {
    hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstname: firstName,
        lastname: lastName,
        mobileNumber: mobileNumber,
        email: email,
        address: address,
        dob: dob,
        role: role,
        lastBooking: lastBooking,
        country: country,
        gender: gender,
        pincode: pincode,
        avatarSrc: avatarSrc,
        frequentlyFlyer: frequentlyFlyer,
        passportDetails: passportDetails,
        password: hashedPassword!,
        coTraveler: coTraveler,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete a user
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.user?.id;

  try {
    await prisma.user.delete({
      where: {
        id: id,
      },
    });

    res.status(204).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const deleteCoTraveller = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const id = req.user?.id;
  const data = req.body;

  if (!id) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: id,
      },
      data: data,
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error deleting co-traveller:", error);
    return res.status(500).json({ error: "Failed to delete co-traveller" });
  }
};

export const delUser = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    await prisma.user.delete({
      where: {
        id: id,
      },
    });

    res.status(204).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const id = req.user?.id;
  const data = req.body;

  if (!id) {
    return res
      .status(401)
      .json({ error: "Unauthorized access, user ID missing" });
  }

  const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        ...data,
        password: hashed,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error changing password:", error);
    return res.status(500).json({ error: "Failed to change password" });
  }
};
