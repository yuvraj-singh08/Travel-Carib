import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import { createHash } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

const getHash = (data: Buffer): string => {
  const hash = createHash("md5");
  hash.update(data);
  return hash.digest("hex");
};

const Bucket: string = process.env.BUCKET_NAME!;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export default upload;
