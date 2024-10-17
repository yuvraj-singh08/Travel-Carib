import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

export async function main(email: string, id: string) {
  // Read the HTML template
  const templatePath = path.join(process.cwd(), 'templates', 'reset-password.html');
  const source = fs.readFileSync(templatePath, 'utf-8');
  
  // Compile the template
  const template = Handlebars.compile(source);
  
  // Set the data for the template
  const data = {
    email: email,
    id: id,
    resetLink: `https://flight.exions.xyz/reset-password?email=${email}&id=${id}`
  };
  
  // Generate the HTML
  const HTML = template(data);
  
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
    subject: "Reset password link",
    text: `Click here to reset your password: ${data.resetLink}`,
    html: HTML,
  });

  return info;
}