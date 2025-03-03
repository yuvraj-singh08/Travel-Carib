import { NextFunction, Request, Response } from "express";
import KiuClient, { KiuClientInstance } from "../api-clients/KiuClient";
import { getPossibleRoutes } from "../utils/flights";

class KiuController {
    private kiuClient: KiuClientInstance;

    constructor({ kiuClient }: { kiuClient: KiuClientInstance }) {
        this.kiuClient = kiuClient;
        this.searchFlights = this.searchFlights.bind(this);
        this.multiCitySearch = this.multiCitySearch.bind(this);
        this.newSearchFlights = this.newSearchFlights.bind(this);
    }

    static async create() {
        try {
            const kiuClient = await KiuClient.create();
            return kiuClient;
        } catch (error) {
            throw error;
        }
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { OriginLocation, DestinationLocation, DepartureDate, CabinClass, ReturnDate, Passengers } = req.body;
            const response = await this.kiuClient.searchFlights({ OriginLocation, CabinClass, DestinationLocation, DepartureDate, ReturnDate, Passengers, tripOrigin: OriginLocation, tripDestination: DestinationLocation }, "FWE", null);
            res.send(response);
        } catch (error) {
            next(error);
        }
    }

    async newSearchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { OriginDestinationOptions, CabinClass, ReturnDate, Passengers } = req.body;
            const response = await this.kiuClient.newSearchFlights({ OriginDestinationOptions,CabinClass, ReturnDate, Passengers });
            res.json(response);
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