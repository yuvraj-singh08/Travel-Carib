import nodemailer from "nodemailer";
import { generateOTP } from "../src/utils/otp";
import { prisma } from "../src/prismaClient";

export async function sendOTP(email: string, id: string) {
  // Set the data for the template
  const data = {
    email: email,
    id: id,
    otp: generateOTP(),
  };

  const otp = await prisma.otp.create({
    data: {
      otp: data.otp,
      email: data.email,
      User: {
        connect: {
          id: data.id,
        },
      },
    },
  });

  if (!otp) {
    throw new Error("Failed to create otp");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL!,
      pass: process.env.PASSWORD!,
    },
  });

  const info = await transporter.sendMail({
    from: `"Vuelitos" <${process.env.EMAIL}>`,
    to: email,
    subject: "Verify OTP",
    text: `Verify using this otp: ${data.otp}`,
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Reset Password</title>
        </head>
        <body>
            <h1>Verify using OTP:</h1>
            <h4>${data.otp}</h4>
        </body>
        </html>
    `,
  });

  return info.messageId;
}
