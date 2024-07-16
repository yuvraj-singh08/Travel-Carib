import { Request, Response, NextFunction } from "express";
import AmadeusClient from "../api-clients/AmadeusClient";

class AmadusController {
    private amadusClient;

    constructor() {
        this.amadusClient = new AmadeusClient();
        this.citySearch = this.citySearch.bind(this);
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
}

export default AmadusController;