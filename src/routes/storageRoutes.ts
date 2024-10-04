import { Router, Response } from "express";
import { handleFileUpload, uploadFile } from "../controllers/storageController";

const router = Router();

router.post("/upload", uploadFile, handleFileUpload);

export default router;
