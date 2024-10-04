import { Router} from "express";
import { getFileUploadUrl } from "../controllers/storageController";

const router = Router();

router.get("/get-url", getFileUploadUrl);

export default router;
