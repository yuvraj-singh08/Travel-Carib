import { Request, Response, NextFunction } from "express";
import AmadeusClient from "../api-clients/AmadeusClient";
import { parseFlightOfferSearchResponse } from "../utils/amadeus";
import { amadeusClientType } from "../../types/amadeusTypes";

class AmadusController {
    private amadeusClient: amadeusClientType;

    constructor({ amadeusClient }: { amadeusClient: amadeusClientType }) {
        this.amadeusClient = amadeusClient;
        this.citySearch = this.citySearch.bind(this);
        this.searchFlights = this.searchFlights.bind(this);
        this.flightPrice = this.flightPrice.bind(this);
        this.priceCalendar = this.priceCalendar.bind(this);
        this.bookFlight = this.bookFlight.bind(this);
        this.testBookFlight = this.testBookFlight.bind(this);
    }

    static async create() {
        try {
            const amadeusClient = await AmadeusClient.create();
            const amadeusController = new AmadusController({ amadeusClient });
            return amadeusController;
        } catch (error) {
            throw error;
        }
    }

    async citySearch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { query } = req.params;
            const response = await this.amadeusClient.citySearch(query, "CITY,AIRPORT");
            res.json({ data: JSON.parse(response) });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async priceCalendar(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { origin, destination, date1, date2, oneWay } = req.query;
            if (!origin || !destination || !date1) {

                res.status(400).json({ message: "Missing Required Fields" })
                return;
            }
            const response = await this.amadeusClient.priceCalendar({ origin, destination, date1, date2, oneWay });
            res.status(200).json(response)
        } catch (error) {
            next(error);
        }
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { departure, locationDeparture, locationArrival, adults } = req.body;
            if (departure === undefined || locationArrival === undefined || locationDeparture === undefined) {
                throw new Error("Missing required fields: departure, locationDeparture, locationArrival");
            }
            const response = await this.amadeusClient.searchFlights({ departure, locationDeparture, locationArrival, adults });
            // const parsedResponse = parseFlightOfferSearchResponse(response.data);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
    async flightPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { departure, locationDeparture, locationArrival, adults } = req.body;

            if (!departure || !locationDeparture || !locationArrival) {
                throw new Error("Missing required fields: departure, locationDeparture, locationArrival");
            }

            const response = await this.amadeusClient.flightPrice({ departure, locationDeparture, locationArrival, adults });
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async bookFlight(req: Request, res: Response, next: NextFunction) {
        try {
            const response = await this.amadeusClient.bookingFlight();
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async testBookFlight(req: Request, res: Response, next: NextFunction) {
        try {
            const { departure, locationDeparture, locationArrival, adults, passengers } = req.body;
            const passengersData = passengers.map((passenger, index) => {
                let returnValue = {
                    id: index + 1,
                    dateOfBirth: passenger.dob,
                    name: {
                        firstName: passenger.firstName,
                        lastName: passenger.lastname,
                    },
                    gender: passenger.gender,
                    contact: {
                        emailAddress: passenger.email,
                        phones: [
                            {
                                deviceType: "MOBILE",
                                countryCallingCode: passenger.phoneNumber.slice(0, passenger.phoneNumber.length - 10),
                                number: passenger.phoneNumber.slice(passenger.phoneNumber.length - 10),
                            },
                        ],
                    },
                    documents: [
                        {
                            documentType: "PASSPORT",
                            birthPlace: passenger.nationality,
                            issuanceLocation: passenger.issuingCountry,
                            issuanceDate: "2015-04-14",
                            number: passenger.passportNumber,
                            expiryDate: passenger.passportExpiryDate,
                            issuanceCountry: passenger.issuingCountry,
                            validityCountry: passenger.issuingCountry,
                            nationality: passenger.issuingCountry,
                            holder: true,
                        },
                    ],
                }
                return returnValue
            })
            const response = await this.amadeusClient.testBookingApi({ departure, locationDeparture, locationArrival, adults }, passengersData);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
}

export default AmadusController;