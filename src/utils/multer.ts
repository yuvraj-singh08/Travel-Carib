import multer from "multer";

// const storage = multer.memoryStorage(); // store file in memory buffer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'), // Make sure 'uploads' folder exists
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  

export const upload = multer({ storage });