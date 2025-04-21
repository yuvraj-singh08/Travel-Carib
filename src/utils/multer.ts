import multer from "multer";

const storage = multer.memoryStorage(); // store file in memory buffer

  

export const upload = multer({ storage });