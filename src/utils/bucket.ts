import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION_NAME,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to generate a random alphanumeric ID of length 5
const generateRandomId = (length: number) => {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, length);
};

export const generateUploadUrl = async () => {
  const date = new Date();
  const randomId = generateRandomId(5);
  const imageName = `vuelitos-${randomId}.jpeg`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME as string,
    Key: imageName,
    ContentType: "image/jpeg",
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 1000,
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};
