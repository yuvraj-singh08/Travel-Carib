import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.searchFlights = this.searchFlights.bind(this);
    this.amadeusSearchFlights=this.amadeusSearchFlights.bind(this);
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
  async amadeusSearchFlights(req : Request , res:Response , next: NextFunction ) : Promise<void>{
    try {
      const{locationArrival,locationDeparture,departure,arrival,adults} = req.body;
      const response = await this.flightClient.amadeusOfferSearch({
        originLocation: locationDeparture,
        destinationLocation:locationArrival,
         departureDate:departure,
        passengerType:adults
      })
       console.log("Amadeus API Response:", response);
      res.status(200).json(response)
    } catch (error:any) {
      res.json(error);
      
    }
  }
}

export default FlightController;
