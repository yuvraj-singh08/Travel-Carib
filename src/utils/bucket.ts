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
export const generateRandomId = (length: number) => {
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




import axios from "axios";





export const uploadImageFromUrl = async (imageUrl) => {
  console.log("url in uploadImageFromUrl",imageUrl)
  const randomId = generateRandomId(5);
  const imageName = `vuelitos-${randomId}.jpeg`;

  try {
    // Download image from the provided URL
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data);

    const contentType = response.headers["content-type"];
    // if (!contentType || !contentType.startsWith("image/")) {
    //   console.log("contentType",contentType);
      
    //   throw new Error("Invalid image URL or unsupported image format");
    // }

    // Upload image to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imageName,
      Body: imageBuffer,
      // ContentType: "image/jpeg",
      ContentType: contentType,

    });

    const res=await s3Client.send(command);
    console.log("res in uploadImageFromUrl",res);
    
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${imageName}`;
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw error;
  }
};




export const uploadImage = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    // ContentType: mimeType,
  });
   console.log("command", process.env.AWS_BUCKET_NAME,process.env.AWS_ACCESS_KEY,process.env.AWS_SECRET_ACCESS_KEY);

  await s3Client.send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${fileName}`;
};
