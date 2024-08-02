import { NextFunction, Request, Response } from "express";
import KiuClient from "../api-clients/KiuClient";

class KiuController{
    private kiuClient;

    constructor(){
        this.kiuClient = new KiuClient();
        this.searchFlights = this.searchFlights.bind(this);
    }

    async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {OriginLocation, DestinationLocation, DepartureDate, ReturnDate, Passengers} = req.body;
            const response = await this.kiuClient.searchFlights({OriginLocation, DestinationLocation, DepartureDate, ReturnDate, Passengers});
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
}

export default KiuController;