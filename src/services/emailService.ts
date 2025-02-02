import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import { format } from "date-fns";
import { generateBookingPdf } from "./pdfService";

const hbs = require("nodemailer-express-handlebars");

dotenv.config();

function generateDownloadUrl(bookingId: string): string {
  
  return `${process.env.BACKEND}/email/pdf/${bookingId}`;
}



export const sendEmail = async (bookingData: any) => {
  console.log("bookingData",bookingData?.contactDetail?.email);
  const downloadLink = generateDownloadUrl(bookingData.id)
  console.log("downloadLink",downloadLink)

  let processedBookingData = {
    ...bookingData,
    downloadLink,
    passenger: (() => {
      if (!bookingData.passenger) return []; 
      if (typeof bookingData.passenger === "string") {
        try {
          return JSON.parse(bookingData.passenger); 
        } catch (error) {
          console.error("Error parsing passenger data:", error);
          return []; 
        }
      }
      return Array.isArray(bookingData.passenger) ? bookingData.passenger : [bookingData.passenger];
    })(),
  };

  
  const pdfBuffer = await generateBookingPdf(processedBookingData);

  

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      // user: process.env.EMAIL,
      // pass: process.env.PASSWORD,
      user: "hemant@adirayglobal.com",
      pass: "ogmnatcklinhjoyl",
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
          return format(date, "HH:mm");
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
        inc:(value:any)=>{
          return parseInt(value) +1;
        }
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
    from:"hemant27134@gmail.com", 
    to: bookingData?.contactDetail?.email,
    bcc:"hemant27134@gmail.com,neeleshishu021@gmail.com",
    subject: "Your Flight Ticket Confirmation",
    template: "template_6",
    context: processedBookingData,
    attachments: [{
      filename: `ticket-${bookingData.id}.pdf`,
      content: Buffer.from(pdfBuffer),
      contentType: 'application/pdf'
    }]
  };

  await transporter.sendMail(mailOptions);
};
