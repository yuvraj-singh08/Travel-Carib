import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.searchFlights = this.searchFlights.bind(this);
  }

  async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { originLocation, destinationLocation, departureDate, passengerType, returnDate, cabinClass, maxConnections } = req.body;
      const response = await this.flightClient.flightOfferSearch({
        originLocation,
        destinationLocation,
        departureDate,
        passengerType
      })
      res.status(200).json(response);
    } catch (error: any) {
      next(error);
    }
  }
}

export default FlightController;
