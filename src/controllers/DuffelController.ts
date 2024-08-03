import { Request, Response, NextFunction } from "express";
import DuffelClient, { DuffelClientInstance } from "../api-clients/DuffelClient";

class DuffelController {
    private duffelClient: DuffelClientInstance;

    constructor() {
        this.duffelClient = new DuffelClient();
        this.searchFlights = this.searchFlights.bind(this);
        this.getFlightDetails = this.getFlightDetails.bind(this);
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { originLocation, destinationLocation, departureDate, passengerType, returnDate, cabinClass, maxConnections } = req.body;
            const offerRequest = await this.duffelClient.createOfferRequest({
                slices: [
                    {
                        origin: originLocation,
                        destination: destinationLocation,
                        departure_date: departureDate,
                    }
                ],
                passengers: [{ type: "adult" }],
                    cabin_class: "economy",
                    max_connections: 2
            })
            const response = await this.duffelClient.getOfferRequestById(offerRequest.data.id);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async getFlightDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {id} = req.body;
            const flightDetails = await this.duffelClient.getFlightDetails(id);
            res.status(200).json(flightDetails);
        } catch (error) {
            next(error);
        }
    }
}

export default DuffelController;