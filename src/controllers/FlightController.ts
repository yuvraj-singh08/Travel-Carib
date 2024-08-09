import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';
import { getPossibleRoutes } from '../utils/flights';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.searchFlights = this.searchFlights.bind(this);
    this.amadeusSearchFlights=this.amadeusSearchFlights.bind(this);
  }

  async searchFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections } = req.body;
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
  async amadeusSearchFlights(req : Request , res:Response , next: NextFunction ) : Promise<void>{
    try {
      const{locationArrival,locationDeparture,departure,arrival,cabinClass,adults, maxLayovers} = req.body;
      const response = await this.flightClient.amadeusOfferSearch({
        originLocation: locationDeparture,
        destinationLocation:locationArrival,
         departureDate:departure,
        passengerType:adults,
        maxLayovers,
        cabinClass
      })
       console.log("Amadeus API Response:", response);
      res.status(200).json(response)
    } catch (error:any) {
      res.json(error);
      
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
