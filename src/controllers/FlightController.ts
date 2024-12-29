import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';
import { getPossibleRoutes } from '../utils/flights';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.advanceFlightSearch = this.advanceFlightSearch.bind(this);
    this.multiCitySearch = this.multiCitySearch.bind(this);
  }

  async advanceFlightSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filters, originLocation, passengers, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections, sortBy } = req.body;
      if (!(originLocation !== undefined && destinationLocation !== undefined && departureDate !== undefined && maxLayovers !== undefined && passengerType !== undefined && cabinClass !== undefined))
        throw new Error("Missing required fields: originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections");

      const response = await this.flightClient.advanceFlightSearch({
        originLocation,
        destinationLocation,
        passengers,
        departureDate,
        passengerType,
        maxLayovers,
        cabinClass,
        filters,
        sortBy: sortBy || "BEST"
      })
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async multiCitySearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { FlightDetails, passengerType, passengers, maxLayovers, cabinClass, filters, sortBy } = req.body;
      if (!FlightDetails || FlightDetails.length == 0 || !maxLayovers || !passengerType || !cabinClass) {
        throw new Error("Missing required fields: FlightDetails, passengerType, maxLayovers, cabinClass, filters");
      }
      const response = await this.flightClient.multiCityFlightSearch({
        FlightDetails,
        passengerType,
        maxLayovers,
        passengers,
        sortBy: sortBy || "BEST",
        cabinClass,
        filters
      })
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async roundFlightSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filters, originLocation, destinationLocation, passengers, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections, sortBy } = req.body;
      if (!(originLocation !== undefined && destinationLocation !== undefined && departureDate !== undefined && maxLayovers !== undefined && passengerType !== undefined && cabinClass !== undefined))
        throw new Error("Missing required fields: originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections");

      const response = await this.flightClient.advanceFlightSearch({
        originLocation,
        destinationLocation,
        departureDate,
        sortBy: sortBy || 'BESsortByT',
        returnDate,
        passengerType,
        maxLayovers,
        cabinClass,
        filters,
        passengers
      })
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPossibleRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { origin, destination, maxLayovers } = req.body;
      const possibleRoutes = getPossibleRoutes(origin, destination, maxLayovers);
      res.status(200).json(possibleRoutes);
    } catch (error) {
      next(error);
    }
  }
}

export default FlightController;
