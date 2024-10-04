import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import upload from "../utils/multer";
import { AuthenticatedRequest } from "../../types/express";

export const uploadFile = upload.single("file");

export const handleFileUpload = async (req, res) => {
  //   const userId = req.user?.id;

  //   if (!userId) {
  //     return res
  //       .status(401)
  //       .json({ error: "Unauthorized access, user ID missing" });
  //   }
  try {
    console.log(req.file);
    // const file = await prisma.file.create({
    //   data: {
    //     originalname,
    //     key,
    //     location,
    //     userId,
    //   },
    // });
    // res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
