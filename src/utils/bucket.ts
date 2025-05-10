import { S3Client, PutObjectCommand, ObjectCannedACL  } from "@aws-sdk/client-s3";
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


const s3ClientNew = new S3Client({
  region: process.env.AWS_REGION_NAME,
  credentials: {
    accessKeyId: process.env.AWS_NEW_ACCESS_KEY,
    secretAccessKey: process.env.AWS_NEW_SECRET_ACCESS_KEY,
  },
});







export const uploadImage = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_NEW_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    // ContentType: mimeType,
  });
   console.log("command", process.env.AWS_NEW_BUCKET_NAME,process.env.AWS_NEW_ACCESS_KEY,process.env.AWS_NEW_SECRET_ACCESS_KEY);

  await s3ClientNew.send(command);

  return `https://${process.env.AWS_NEW_BUCKET_NAME}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${fileName}`;
};





import { randomBytes } from 'crypto';

// Validate environment variables on startup
const requiredEnvVars = [
  'AWS_REGION_NAME',
  'AWS_NEW_ACCESS_KEY',
  'AWS_NEW_SECRET_ACCESS_KEY',
  'AWS_NEW_BUCKET_NAME'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});


// Utility function for generating random IDs


// Middleware for validating image URL






const generateId = (length = 12) => {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};




export const uploadImageFromUrl = async (imageUrl) => {
  try {
    // Fetch image with timeout and size limit
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 10000, // 10 seconds timeout
      maxContentLength: 5 * 1024 * 1024, // 5MB limit
    });

    const contentType = response.headers['content-type'];
    if (!contentType?.startsWith('image/')) {
      throw new Error('Invalid content type - not an image');
    }

    const imageBuffer = Buffer.from(response.data);
    const fileExtension = contentType.split('/')[1] || 'jpeg';
    // const imageName = `vuelitos-${generateId()}.${fileExtension}`;
    const urlObj = new URL(imageUrl);
    const originalFilename = urlObj.pathname.split('/').pop() || 'image';
    const fileExt = originalFilename.split('.').pop() || 'bin';
    const imageName = `vuelitos-${generateId()}.${fileExt}`;
   
    //  const uploadParams = {
    //   Bucket: process.env.AWS_NEW_BUCKET_NAME,
    //   Key: imageName,
    //   Body: imageBuffer,
    //   ContentType: contentType,
    //   // ACL: ObjectCannedACL.public_read, // Use the enum value
    // };

     const uploadParams = {
      Bucket: process.env.AWS_NEW_BUCKET_NAME!,
      Key: imageName,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
      // These are REQUIRED for ACL-disabled buckets:
      Metadata: {
        'Cache-Control': 'public, max-age=31536000'
      }
    };


    await s3ClientNew.send(new PutObjectCommand(uploadParams));
    const encodedKey = encodeURIComponent(imageName);
    return `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION_NAME}.amazonaws.com/${encodedKey}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};
