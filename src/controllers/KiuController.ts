import { NextFunction, Request, Response } from "express";
import KiuClient, { KiuClientInstance } from "../api-clients/KiuClient";
import { getPossibleRoutes } from "../utils/flights";

class KiuController {
    private kiuClient: KiuClientInstance;

    constructor() {
        this.kiuClient = new KiuClient();
        this.searchFlights = this.searchFlights.bind(this);
        this.multiCitySearch = this.multiCitySearch.bind(this);
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { OriginLocation, DestinationLocation, DepartureDate, ReturnDate, Passengers } = req.body;
            const response = await this.kiuClient.searchFlights({ OriginLocation, DestinationLocation, DepartureDate, ReturnDate, Passengers });
            res.send(response);
        } catch (error) {
            next(error);
        }
    }

    async multiCitySearch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { OriginLocation, DestinationLocation, DepartureDate, ReturnDate, Passengers } = req.body;
            const segments = getPossibleRoutes(OriginLocation, DestinationLocation, 2)
            const response = await this.kiuClient.multiCitySearch({
                routeSegments: [
                    {
                        origin: "VLN",
                        destination: "CCS"
                    },
                    {
                        origin: "CCS",
                        destination: "SDQ"
                    },
                ],
                departureDate: DepartureDate,
                passengers: 1
            })
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
}


export default KiuController;