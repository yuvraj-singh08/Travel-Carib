import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION_NAME,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const generateUploadUrl = async () => {
  const date = new Date();
  const imageName = `vuelitos-${date.getTime()}.jpeg`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME as string,
    Key: imageName,
    ContentType: "image/jpeg",
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 1000 });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};