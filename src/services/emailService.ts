import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import { format } from "date-fns";
import { generateNewPdf } from "./pdfService";
import { getSocials } from "../controllers/adminController";
import { prisma } from "../prismaClient";
import { uploadImageToS3 } from "../controllers/storageController";

const hbs = require("nodemailer-express-handlebars");

dotenv.config();

type SocialPlatform = {
  platform:
    | "facebook"
    | "instagram"
    | "youtube"
    | "x"
    | "linkedin"
    | "whatsapp"
    | "telegram"
    | "discord"
    | "tiktok"
    | "snapchat";
  url: string;
  enabled: boolean;
};

function generateDownloadUrl(bookingId: string): string {
  return `${
    process.env.BACKEND || "https://travelcarib.tekniche.xyz"
  }/email/pdf/${bookingId}`;
}
const fetchSocials = async () => {
  try {
    const socials = await prisma.socialSettings.findMany();
    return socials;
  } catch (error) {
    console.error("Error fetching socials:", error);
    throw error;
  }
};

export const sendEmail = async (bookingData: any) => {
  console.log("bookingData", bookingData?.contactDetail?.email);
  const downloadLink = generateDownloadUrl(bookingData.id);
  console.log("downloadLink", downloadLink);

  const socialLinks = await fetchSocials();
  //@ts-ignore
  const links: SocialPlatform[] = socialLinks[0].socialPlatforms;
  console.log("response sociAL", links[0].url);


  // const processFlightLogos = async (flightData: any): Promise<any> => {
  //   if (!flightData) return flightData;
  
  //   // Handle array case
  //   if (Array.isArray(flightData)) {
  //     return Promise.all(flightData.map(async (item) => await processFlightLogos(item)));
  //   }
  
  //   // Handle object case
  //   if (typeof flightData === 'object') {
  //     // Check if we're at the operating_carrier level
  //     if (flightData.operating_carrier?.logo_symbol_url && flightData.operating_carrier?.iata_code) {
  //       try {
  //         const newUrl = await uploadImageToS3(
  //           flightData.operating_carrier.logo_symbol_url,
  //           flightData.operating_carrier.iata_code
  //         );
  //         flightData.operating_carrier.logo_symbol_url = newUrl;
  //       } catch (error) {
  //         console.error('Error uploading airline logo:', error);
  //       }
  //     }
  
  //     // Recursively process object properties
  //     await Promise.all(Object.keys(flightData).map(async (key) => {
  //       flightData[key] = await processFlightLogos(flightData[key]);
  //     }));
  //   }
  
  //   return flightData;
  // };


  // let processedBookingData = {
  //   ...bookingData,
  //   downloadLink,
  //   links,
  //   passenger: (() => {
  //     /* existing passenger logic */
  //   })(),
  // };
  
  // // Process flight details for all possible structures
  // processedBookingData = {
  //   ...processedBookingData,
  //   flightDetails: await processFlightLogos(processedBookingData.flightDetails),
  // };





  let processedBookingData = {
    ...bookingData,
    downloadLink,
    links,
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
      return Array.isArray(bookingData.passenger)
        ? bookingData.passenger
        : [bookingData.passenger];
    })(),
  };

  console.log("processedBookingData", processedBookingData);


  const pdfBuffer = await generateNewPdf(processedBookingData);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
      // user: "hemant@adirayglobal.com",
      // pass: "ogmnatcklinhjoyl",
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
          console.log("data in helper",date);
          
          return format(date, "EEE, MMMM dd, yyyy");
        },
        formatDuration: function (duration) {
          return (duration ?? "").replace("PT", "").replace("H", "h ").replace("M", "m").trim();
        },
           
        eq: (a: any, b: any) => a === b,
        or: (...args) => {
          // The last argument is the Handlebars options object, so we exclude it
          const conditions = args.slice(0, -1);
          return conditions.some(condition => !!condition);
      },
        // Add helper to safely access passenger data
        getPassenger: (passengers: any[], index: number) => {
          return passengers && passengers[index] ? passengers[index] : {};
          
        },

        inc: (value: any) => {
          return parseInt(value) + 1;
        },

        uploadLogo: async (url: string, iataCode: string) => {
          console.log("url in helper")
          try {
            const newUrl = await uploadImageToS3(url, iataCode);
            console.log("url in helper",newUrl)
            return newUrl;
          } catch (error) {
            console.error('Error in uploadLogo helper:', error);
            return url; // Return the original URL if there's an error
          }
        },


      },
    },
    viewPath: path.resolve("./src/services/views/"),
    extName: ".hbs",
  };

  transporter.use("compile", hbs(handlebarOptions));

  const recipientEmail =
    processedBookingData.contactDetail?.email ||
    processedBookingData.passenger[0]?.email;

  if (!recipientEmail) {
    throw new Error("Recipient email is missing in booking data");
  }

  const mailOptions = {
    from: "hemant27134@gmail.com",
    // to: bookingData?.contactDetail?.email,
    to:"hemant27134@gmail.com",
    // bcc: "hemant27134@gmail.com,neeleshishu021@gmail.com,projectdesksoftnear@gmail.com",
    subject: "Your Flight Ticket Confirmation",
    template: "template_7",
    context: processedBookingData,
    attachments: [{
      filename: `ticket-33${bookingData.id}.pdf`,
      content: Buffer.from(pdfBuffer),
      contentType: 'application/pdf'
    }]
  };
  await transporter.sendMail(mailOptions);
};
