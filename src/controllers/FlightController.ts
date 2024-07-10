import { Request, Response } from 'express';
import FlightSearchService from '../services/FlightSearchService';

class FlightController {
  private flightSearchService: FlightSearchService;

  constructor() {
    this.flightSearchService = new FlightSearchService();
  }

  async searchFlights(req: Request, res: Response): Promise<void> {
    try {
      const flights = await this.flightSearchService.searchFlights(req.body);
      res.json(flights);
    } catch (error: any) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default FlightController;
