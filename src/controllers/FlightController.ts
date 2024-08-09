import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';
import { getPossibleRoutes } from '../utils/flights';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.searchFlights = this.searchFlights.bind(this);
  }

  async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections } = req.body;
      if(!(originLocation!== undefined && destinationLocation!== undefined && departureDate!== undefined && maxLayovers!== undefined && passengerType!== undefined && cabinClass!== undefined))
        throw new Error("Missing required fields: originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections");

      const response = await this.flightClient.flightSearch({
        originLocation,
        destinationLocation,
        departureDate,
        passengerType,
        maxLayovers,
        cabinClass
      })
      res.status(200).json(response);
    } catch (error: any) {
      next(error);
    }
  }

  async getPossibleRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {origin, destination, maxLayovers}  = req.body;
      const possibleRoutes = getPossibleRoutes(origin,destination, maxLayovers);
      res.status(200).json(possibleRoutes);
    } catch (error) {
      next(error);
    }
  }
}

export default FlightController;
