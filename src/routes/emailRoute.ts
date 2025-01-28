import express from "express";
import { sendEmail } from "../services/emailService";
import axios from "axios";



const router = express.Router();


const userData =async (bookingId:any) =>{
  try{
    const response = await axios.get(`https://travelcarib.tekniche.xyz/book/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    
    const bookingData = await response.data;

    
    return bookingData;
  }catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

router.post("/send", async (req, res) => {
  const { bookingId } = req.body;
  
  const bookingData = await userData(bookingId);
  
  try {
    await sendEmail(bookingData.data);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
  }
);




export default router;
