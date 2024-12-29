import { Request, Response, NextFunction } from "express";
import AmadeusClient from "../api-clients/AmadeusClient";
import { parseFlightOfferSearchResponse } from "../utils/amadeus";
import { amadeusClientType } from "../../types/amadeusTypes";

class AmadusController {
    private amadusClient: amadeusClientType;

    constructor() {
        this.amadusClient = new AmadeusClient();
        this.citySearch = this.citySearch.bind(this);
        this.searchFlights = this.searchFlights.bind(this);
        this.flightPrice = this.flightPrice.bind(this);
        this.priceCalendar = this.priceCalendar.bind(this);
    }

    async citySearch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { query } = req.params;
            const response = await this.amadusClient.citySearch(query, "CITY,AIRPORT");
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
            const response = await this.amadusClient.priceCalendar({ origin, destination, date1, date2, oneWay });
            res.status(200).json(response)
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { departure, locationDeparture, locationArrival, adults } = req.body;
            if (departure === undefined || locationArrival === undefined || locationDeparture === undefined) {
                throw new Error("Missing required fields: departure, locationDeparture, locationArrival");
            }
            const response = await this.amadusClient.searchFlights({ departure, locationDeparture, locationArrival, adults });
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

            const response = await this.amadusClient.flightPrice({ departure, locationDeparture, locationArrival, adults });
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
}

export default AmadusController;