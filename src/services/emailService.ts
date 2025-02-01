import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import { format } from "date-fns";

const hbs = require("nodemailer-express-handlebars");

dotenv.config();



export const sendEmail = async (bookingData: any) => {
  // Parse the passenger data which is stored as a JSON string
  console.log(bookingData)


  let processedBookingData = {
    ...bookingData,
    passenger: (() => {
      if (!bookingData.passenger) return []; // Handle undefined/null case
      if (typeof bookingData.passenger === "string") {
        try {
          return JSON.parse(bookingData.passenger); // Convert string to array
        } catch (error) {
          console.error("Error parsing passenger data:", error);
          return []; // Return an empty array if parsing fails
        }
      }
      return Array.isArray(bookingData.passenger) ? bookingData.passenger : [bookingData.passenger];
    })(),
  };

  // In your Express/Node.js file
  

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const handlebarOptions = {
    viewEngine: {
      extName: ".hbs",
      partialsDir: path.resolve(__dirname, "./src/services/views/"),
      layoutsDir: path.resolve(__dirname, "./src/services/views/"),
      defaultLayout: "",
      helpers: {
        formatDate: (datetime: string) => {
          const date = new Date(datetime);
          return format(date, "EEE, dd MMM yyyy");
        },
        formatTime: (datetime: string) => {
          const date = new Date(datetime);
          return format(date, "HH.mm");
        },
        formatIsoDate: (isoDate: string) => {
          const date = new Date(isoDate);
          return format(date, "EEE, MMMM dd, yyyy");
        },
        formatDuration: function (duration) {
          return duration.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
        },
        eq: (a: any, b: any) => a === b,
        // Add helper to safely access passenger data
        getPassenger: (passengers: any[], index: number) => {
          return passengers && passengers[index] ? passengers[index] : {};
        },
      },
    },
    viewPath: path.resolve("./src/services/views/"),
    extName: ".hbs",
  };

  transporter.use("compile", hbs(handlebarOptions));

  const recipientEmail = processedBookingData.contactDetail?.email || 
                        (processedBookingData.passenger[0]?.email);
                        
  if (!recipientEmail) {
    throw new Error("Recipient email is missing in booking data");
  }

  const mailOptions = {
    from: process.env.EMAIL,
    to: recipientEmail,
    subject: "Your Flight Ticket Confirmation",
    template: "ticket-confermation-template",
    context: processedBookingData
  };

  await transporter.sendMail(mailOptions);
};
