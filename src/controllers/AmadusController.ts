import { Request, Response, NextFunction } from "express";
import AmadeusClient from "../api-clients/AmadeusClient";

class AmadusController {
    private amadusClient;

    constructor() {
        this.amadusClient = new AmadeusClient();
        this.citySearch = this.citySearch.bind(this);
        this.searchFlights = this.searchFlights.bind(this);
        this.flightPrice=this.flightPrice.bind(this);
    }

    async citySearch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { query } = req.params;
            const response = await this.amadusClient.citySearch(query, "CITY,AIRPORT");
            res.json({ data: response });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {departure, locationDeparture, locationArrival} = req.body;
            if(departure === undefined || locationArrival === undefined || locationDeparture === undefined){
                throw new Error("Missing required fields: departure, locationDeparture, locationArrival");
            }
            const response = await this.amadusClient.searchFlights({ departure, locationDeparture, locationArrival });
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
    async flightPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const flight = {
                locationDeparture: req.body.locationDeparture,
                locationArrival: req.body.locationArrival,
                departure: req.body.departure,
            };

            const price = await this.amadusClient.flightPrice(flight);
            res.status(200).json(price);
        } catch (error) {
            next(error);
        }
    }

}

export default AmadusController;