import aws from "aws-sdk";
import uuid from "uuid";

const s3 = new aws.S3({
  region: process.env.AWS_REGION_NAME,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const generateUploadUrl = async () => {
  const date = new Date();
  const imageName = `${uuid}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "vuelitos-images-bucket",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};
