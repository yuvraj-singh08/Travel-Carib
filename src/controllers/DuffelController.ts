import { Request, Response, NextFunction } from "express";
import DuffelClient, { DuffelClientInstance } from "../api-clients/DuffelClient";
import { getOffer } from "../services/OfferService";
import { Offer } from "../../types/flightTypes";

class DuffelController {
    private duffelClient: DuffelClientInstance;

    constructor() {
        this.duffelClient = new DuffelClient();
        this.searchFlights = this.searchFlights.bind(this);
        this.getFlightDetails = this.getFlightDetails.bind(this);
        this.createOrder = this.createOrder.bind(this);
        this.getAvailableServices = this.getAvailableServices.bind(this);
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
            const { id } = req.body;
            const flightDetails = await this.duffelClient.getFlightDetails(id);
            res.status(200).json(flightDetails);
        } catch (error) {
            next(error);
        }
    }

    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { offerId, passengers } = req.body;
            const order = await this.duffelClient.createOrder({ offerId, passengers });
            res.status(200).json(order);
        } catch (error) {
            next(error);
        }
    }

    async getAvailableServices(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { offerId } = req.params;
            const data = await getOffer(offerId);
            const offer = data.data as Offer;
            const duffelOfferId = offer.slices[0].offerId;
            const availableServices = await this.duffelClient.getAvailableServices(duffelOfferId);
            res.status(200).json({ success: true, data: availableServices });
        } catch (error) {
            next(error);
        }
    }
}

export default DuffelController;