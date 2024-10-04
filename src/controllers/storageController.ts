import { Response, Request } from "express";
import { generateUploadUrl } from "../utils/bucket";

export const getFileUploadUrl = async (req: Request, res: Response) => {
  try {
    const url = await generateUploadUrl();
    res.status(200).json({
      uploadURL: url,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};
