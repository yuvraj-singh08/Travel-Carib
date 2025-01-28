import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import dotenv from "dotenv";
import { format } from "date-fns";

// Load environment variables
dotenv.config();

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Your email from .env
    pass: process.env.PASSWORD, // App password from .env
  },
});

// Handlebars options
const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve("./views/"),
    layoutsDir: path.resolve("./views/"),
    defaultLayout: "",
    helpers: {
      formatDate: (datetime) => {
        const date = new Date(datetime);
        return format(date, "EEE, dd MMM yyyy"); // Example: Sun, 29 Jan 2023
      },
      formatTime: (datetime) => {
        const date = new Date(datetime);
        return format(date, "HH.mm"); // Example: 14.50
      },

      formatIsoDate: (isoDate) => {
        // Parse and format the date
        const date = new Date(isoDate);
        return format(date, "EEE, MMMM dd, yyyy"); // Example: "Tue, June 11, 2024"
      },
      eq: (a, b) => a === b,
    },
  },
  viewPath: path.resolve("./views/"),
  extName: ".hbs",
};

// Attach the handlebars plugin to the transporter
transporter.use("compile", hbs(handlebarOptions));

// Example email
const mailOptions = {
  from: process.env.EMAIL,
  to: "shubhamsharmajps@gmail.com",
  subject: "Your Flight Ticket Confirmation",
  template: "ticket-confermation-template", // Name of the .hbs file in the `views` folder
  context: {
    id: "5be6c9a1-f6ce-427d-b358-17eb0607b9a3",
    contactDetail: {
      email: "admin@gmail.com",
      phone: "+918103079874",
    },
    subBooking: [
      {
        pnr: "MLFLWM",
        status: "pending",
        ticketNumber: 1,
      },
    ],
    flightDetails: {
      origin: {
        iata_city_code: "VLC",
        city_name: "Valencia",
        iata_country_code: "ES",
        icao_code: "LEVC",
        iata_code: "VLC",
        latitude: 39.489266,
        longitude: -0.479825,
        city: null,
        time_zone: "Europe/Madrid",
        type: "airport",
        name: "Valencia Airport",
        id: "arp_vlc_es",
      },
      destination: {
        iata_city_code: "MIA",
        city_name: "Miami",
        iata_country_code: "US",
        icao_code: "KMIA",
        iata_code: "MIA",
        latitude: 25.794534,
        longitude: -80.288826,
        city: {
          iata_city_code: "MIA",
          city_name: null,
          iata_country_code: "US",
          icao_code: null,
          iata_code: "MIA",
          latitude: null,
          longitude: null,
          time_zone: null,
          type: "city",
          name: "Miami",
          id: "cit_mia_us",
        },
        time_zone: "America/New_York",
        type: "airport",
        name: "Miami International Airport",
        id: "arp_mia_us",
      },
      responseId: "BA0109",
      commissionAmount: 34.216,
      routeId: "VLCMIA,",
      stops: 0,
      total_amount: 376.37600000000003,
      slices: [
        {
          comparison_key: "B2jx3w==",
          ngs_shelf: 1,
          destination_type: "airport",
          origin_type: "airport",
          fare_brand_name: "Basic",
          segments: [
            {
              origin_terminal: "2",
              destination_terminal: "1",
              aircraft: null,
              departing_at: "2025-01-22T16:15:00",
              arriving_at: "2025-01-22T20:41:00",
              operating_carrier: {
                logo_symbol_url:
                  "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
                logo_lockup_url:
                  "https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/BA.svg",
                conditions_of_carriage_url:
                  "https://www.britishairways.com/en-gb/information/legal/british-airways/general-conditions-of-carriage",
                iata_code: "BA",
                name: "British Airways",
                id: "arl_00009VME7DBKeMags5CliQ",
              },
              marketing_carrier: {
                logo_symbol_url:
                  "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
                logo_lockup_url:
                  "https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/BA.svg",
                conditions_of_carriage_url:
                  "https://www.britishairways.com/en-gb/information/legal/british-airways/general-conditions-of-carriage",
                iata_code: "BA",
                name: "British Airways",
                id: "arl_00009VME7DBKeMags5CliQ",
              },
              operating_carrier_flight_number: "0109",
              stops: [],
              marketing_carrier_flight_number: "0109",
              distance: "7388.12275279916",
              passengers: [
                {
                  cabin: {
                    amenities: {
                      wifi: {
                        cost: "paid",
                        available: true,
                      },
                      seat: {
                        pitch: "30",
                        legroom: "n/a",
                        type: null,
                      },
                      power: {
                        available: true,
                      },
                    },
                    marketing_name: "Economy",
                    name: "economy",
                  },
                  baggages: [
                    {
                      quantity: 1,
                      type: "checked",
                    },
                    {
                      quantity: 1,
                      type: "carry_on",
                    },
                  ],
                  cabin_class_marketing_name: "Economy",
                  passenger_id: "pas_0000AqL2KYZ1MDUylL8zWU",
                  fare_basis_code: "Y20LGTN2",
                  cabin_class: "economy",
                },
              ],
              media: [],
              duration: "PT10H26M",
              destination: {
                iata_city_code: "MIA",
                city_name: "Miami",
                iata_country_code: "US",
                icao_code: "KMIA",
                iata_code: "MIA",
                latitude: 25.794534,
                longitude: -80.288826,
                city: {
                  iata_city_code: "MIA",
                  city_name: null,
                  iata_country_code: "US",
                  icao_code: null,
                  iata_code: "MIA",
                  latitude: null,
                  longitude: null,
                  time_zone: null,
                  type: "city",
                  name: "Miami",
                  id: "cit_mia_us",
                },
                time_zone: "America/New_York",
                type: "airport",
                name: "Miami International Airport",
                id: "arp_mia_us",
              },
              origin: {
                iata_city_code: "VLC",
                city_name: "Valencia",
                iata_country_code: "ES",
                icao_code: "LEVC",
                iata_code: "VLC",
                latitude: 39.489266,
                longitude: -0.479825,
                city: null,
                time_zone: "Europe/Madrid",
                type: "airport",
                name: "Valencia Airport",
                id: "arp_vlc_es",
              },
              id: "seg_0000AqL2KYmqWoYdSDc24k",
              checkedBaggage: 0,
              cabinBaggage: 0,
            },
          ],
          conditions: {
            priority_check_in: null,
            priority_boarding: null,
            advance_seat_selection: null,
            change_before_departure: {
              penalty_currency: null,
              penalty_amount: null,
              allowed: false,
            },
          },
          duration: "PT10H26M",
          destination: {
            iata_city_code: "MIA",
            city_name: "Miami",
            iata_country_code: "US",
            icao_code: "KMIA",
            iata_code: "MIA",
            latitude: 25.794534,
            longitude: -80.288826,
            city: {
              iata_city_code: "MIA",
              city_name: null,
              iata_country_code: "US",
              icao_code: null,
              iata_code: "MIA",
              latitude: null,
              longitude: null,
              time_zone: null,
              type: "city",
              name: "Miami",
              id: "cit_mia_us",
            },
            time_zone: "America/New_York",
            type: "airport",
            name: "Miami International Airport",
            id: "arp_mia_us",
          },
          origin: {
            iata_city_code: "VLC",
            city_name: "Valencia",
            iata_country_code: "ES",
            icao_code: "LEVC",
            iata_code: "VLC",
            latitude: 39.489266,
            longitude: -0.479825,
            city: null,
            time_zone: "Europe/Madrid",
            type: "airport",
            name: "Valencia Airport",
            id: "arp_vlc_es",
          },
          id: "sli_0000AqL2KYnCVUqDTJmJcm",
          sourceId: "DUFFEL",
          offerId: "off_0000AqL2KYnCVUqDTJmJco",
          passengers: [
            {
              fare_type: null,
              loyalty_programme_accounts: [],
              family_name: null,
              given_name: null,
              age: null,
              type: "adult",
              id: "pas_0000AqL2KYZ1MDUylL8zWU",
            },
          ],
          PNR: "MLFLWM",
        },
      ],
      cabinClass: "economy",
    },
    passenger: [
      {
        title: "mr",
        firstName: "Yuvraj",
        lastName: "Singh",
        nationality: "IN",
        gender: "m",
        passportNumber: "ASGE42342",
        passportExpiryDate: "2030-01-01",
        dob: "2000-01-01",
        issuingCountry: "IN",
        phoneNumber: "+918103079814",
        email: "admin@gmail.com",
      },
    ],
    baseFare: 376.376,
    tax_fee_surges: 50,
    otherCharges: 20,
    discount: null,
    totalAmount: 376.376,
    currency: "USD",
    flight_type: "ONEWAY",
    adminStatus: "PENDING_PAYMENT",
    userId: "39317d61-50d0-4166-ac43-e8a897c2114f",
    createdAt: "2025-01-22T11:08:19.822Z",
  },
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Email sent:", info.response);
  }
});
