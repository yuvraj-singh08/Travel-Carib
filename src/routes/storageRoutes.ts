import { Router} from "express";
import { getFileUploadUrl, upload } from "../controllers/storageController";

const router = Router();

router.get("/get-url", getFileUploadUrl);
router.post("/upload-image-from-url", upload);

export default router;
