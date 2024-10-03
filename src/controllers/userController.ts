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
    passportNo,
    dob,
    lastBooking,
    country,
    gender,
    pincode,
    avatarSrc,
    passportImage,
    coTraveler,
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
        passportNo: passportNo,
        dob: dob,
        lastBooking: lastBooking,
        country: country,
        gender: gender,
        pincode: pincode,
        avatarSrc: avatarSrc,
        passportImage: passportImage,
        cotraveler: coTraveler,
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
        avatarSrc: profilePhoto,
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
export const updateUser = async (req: Request, res: Response) => {
  const {
    id,
    firstname,
    lastname,
    mobileNumber,
    email,
    address,
    dob,
    passportNo,
    lastBooking,
    country,
    gender,
    pincode,
    avatarSrc,
    passportImage,
    password,
    cotraveler,
  } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        firstname: firstname,
        lastname: lastname,
        mobileNumber: mobileNumber,
        email: email,
        address: address,
        dob: dob,
        passportNo: passportNo,
        lastBooking: lastBooking,
        country: country,
        gender: gender,
        pincode: pincode,
        avatarSrc: avatarSrc,
        passportImage: passportImage,
        password: password,
        cotraveler: cotraveler,
      },
    });

    res.status(200).json({ message: "User updated", updatedUser: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
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

export const addSupport = async (req: Request, res: Response) => {
  // const userId = req.user?.id;
  const data = req.body;

  try {
    const support = await prisma.userSupport.create({
      data: data,
    });

    return res.status(201).json({
      message: "Support added successfully",
      support: support,
      success: true,
    });
  } catch (err) {
    console.error("Error adding support:", err);
    return res
      .status(500)
      .json({ message: "Error adding support", error: err, success: false });
  }
};

export const getSupport = async (req: Request, res: Response) => {
  try {
    const support = await prisma.userSupport.findMany();
    return res.json(support);
  } catch (err) {
    console.error("Error fetching support:", err);
    return res
      .status(500)
      .json({ message: "Error fetching support", error: err });
  }
};

export const getSupportById = async (req: Request, res: Response) => {
  const { id } = req.body;
  try {
    const support = await prisma.userSupport.findUnique({
      where: {
        id: id,
      },
    });
    if (support) {
      return res.json(support);
    } else {
      return res.status(404).json({ message: "Support not found" });
    }
  } catch (err) {
    console.error("Error fetching support:", err);
    return res
      .status(500)
      .json({ message: "Error fetching support", error: err });
  }
};

export const updateSupport = async (req: Request, res: Response) => {
  const { id, type, title, name, email, description, imgUrl } = req.body;

  try {
    const updatedSupport = await prisma.userSupport.update({
      where: {
        id: id,
      },
      data: {
        type: type,
        title: title,
        name: name,
        email: email,
        description: description,
        imgUrl: imgUrl,
      },
    });
    return res.status(200).json({ message: "Support updated", updatedSupport });
  } catch (err) {
    console.error("Error updating support:", err);
    return res
      .status(500)
      .json({ message: "Error updating support", error: err });
  }
};

export const deleteSupport = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    await prisma.userSupport.delete({
      where: {
        id: id,
      },
    });
    return res.status(204).json({ message: "Support deleted" });
  } catch (err) {
    console.error("Error deleting support:", err);
    return res
      .status(500)
      .json({ message: "Error deleting support", error: err });
  }
};
