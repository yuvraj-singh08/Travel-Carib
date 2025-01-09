import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../../models/userModel";
import { AuthenticatedRequest } from "../../types/express";
import { prisma } from "../prismaClient";
import { sendOTP } from "../../nodemailer/transporter";

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

//forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    //send email
    const messageId = await sendOTP(email, user.id);

    if (!messageId) {
      return res.status(500).json({
        message: "Failed to send OTP",
        success: false,
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

//verify-otp
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const otpData = await prisma.otp.findFirst({
      where: {
        email: email,
        otp: otp,
      },
    });

    if (!otpData) {
      return res.status(404).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    const deleteOTP = await prisma.otp.delete({
      where: {
        id: otpData.id,
      },
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      success: true,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: e.message,
    });
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

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token, user });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email as string,
      },
    });

    if (user !== null) {
      const hashed = await bcrypt.hash(password as string, SALT_ROUNDS);
      const updated = await prisma.user.update({
        where: {
          email: email as string,
        },
        data: {
          password: hashed,
        },
      });

      if (updated) {
        return res.status(200).json({
          message: "Password changed",
          success: true,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to update password",
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: e.message,
    });
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

// Create a new watchlist
export const createWatchlist = async (req: Request, res: Response) => {
  const { userId, flightDetails } = req.body;

  try {
    const newWatchlist = await prisma.watchlist.create({
      data: {
        userId,
        flightDetails,
      },
    });
    return res.status(201).json(newWatchlist);
  } catch (error) {
    console.error("Error creating watchlist:", error);
    return res.status(500).json({ error: "Failed to create watchlist" });
  }
};

// Get all watchlists
export const getAllWatchlists = async (req: Request, res: Response) => {
  try {
    const watchlists = await prisma.watchlist.findMany();
    return res.status(200).json(watchlists);
  } catch (error) {
    console.error("Error fetching watchlists:", error);
    return res.status(500).json({ error: "Failed to fetch watchlists" });
  }
};

// Get a watchlist by ID
export const getWatchlistById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id },
    });

    if (!watchlist) {
      return res.status(404).json({ error: "Watchlist not found" });
    }

    return res.status(200).json(watchlist);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return res.status(500).json({ error: "Failed to fetch watchlist" });
  }
};

// Update a watchlist by ID
export const updateWatchlistById = async (req: Request, res: Response) => {
  const { id, flightDetails } = req.body;

  try {
    const updatedWatchlist = await prisma.watchlist.update({
      where: { id },
      data: { flightDetails },
    });

    return res.status(200).json(updatedWatchlist);
  } catch (error) {
    console.error("Error updating watchlist:", error);
    return res.status(500).json({ error: "Failed to update watchlist" });
  }
};

// Delete a watchlist by ID
export const deleteWatchlistById = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    await prisma.watchlist.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting watchlist:", error);
    return res.status(500).json({ error: "Failed to delete watchlist" });
  }
};
