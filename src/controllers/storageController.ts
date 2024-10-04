import { Response, Request } from "express";
import { generateUploadUrl } from "../utils/bucket";

export const getFileUploadUrl = (req: Request, res: Response) => {
  generateUploadUrl()
    .then((url) => {
      res.status(200).json({
        uploadURL: url,
      });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};
