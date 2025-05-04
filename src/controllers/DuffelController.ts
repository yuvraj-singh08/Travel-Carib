import { Request, Response, NextFunction } from "express";
import DuffelClient, { DuffelClientInstance } from "../api-clients/DuffelClient";
import { getOffer } from "../services/OfferService";
import { Offer } from "../../types/flightTypes";

class DuffelController {
    private duffelClient: DuffelClientInstance;

    constructor({ duffelClient }: { duffelClient: DuffelClientInstance }) {
        this.duffelClient = duffelClient;
        this.searchFlights = this.searchFlights.bind(this);
        this.getFlightDetails = this.getFlightDetails.bind(this);
        this.createOrder = this.createOrder.bind(this);
        this.getAvailableServices = this.getAvailableServices.bind(this);
        this.getOfferRequestById = this.getOfferRequestById.bind(this);
    }

    static async create() {
        try {
            const duffelClient = await DuffelClient.create();
            const duffelController = new DuffelController({ duffelClient });
            return duffelController;
        } catch (error) {
            throw error;
        }
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { OriginDestinationOptions, cabinClass } = req.body;
            const offerRequest = await this.duffelClient.createOfferRequest({
                slices: OriginDestinationOptions.map((option: any) => {
                    return {
                        origin: option.origin,
                        destination: option.destination,
                        departure_date: option.date,
                    }
                }),
                passengers: [{ type: "adult" }],
                cabin_class: cabinClass,
                max_connections: 2
            })
            res.status(200).json(offerRequest);
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
            // const order = await this.duffelClient.createOrder({ offerId, passengers });
            res.status(200).json({});
        } catch (error) {
            next(error);
        }
    }

    async getAvailableServices(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { offerId } = req.params;
            const data = await getOffer(offerId);
            const offer = data.data as Offer;
            const duffelOfferId = offer.slices[0].gdsOfferId;
            const availableServices = await this.duffelClient.getAvailableServices(duffelOfferId);
            res.status(200).json({ success: true, data: availableServices });
        } catch (error) {
            next(error);
        }
    }

    async getOfferRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const offerRequest = await this.duffelClient.getOfferRequestById(id);
            res.status(200).json(offerRequest);
        } catch (error) {
            next(error);
        }
    }
}

export default DuffelController;