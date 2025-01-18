import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';
import { getPossibleRoutes } from '../utils/flights';
import HttpError from '../utils/httperror';
import { getOffer } from '../services/OfferService';
import { Offer } from '../../types/flightTypes';
import { GDS } from '../../constants/cabinClass';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor() {
    this.flightClient = new FlightClient();
    this.advanceFlightSearch = this.advanceFlightSearch.bind(this);
    this.multiCitySearch = this.multiCitySearch.bind(this);
    this.BookFlight = this.BookFlight.bind(this);
  }

  async advanceFlightSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filters, originLocation, passengers, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections, sortBy } = req.body;
      if (!(originLocation !== undefined && destinationLocation !== undefined && departureDate !== undefined && maxLayovers !== undefined && passengerType !== undefined && cabinClass !== undefined))
        throw new Error("Missing required fields: originLocation, destinationLocation, departureDate, maxLayovers, passengerType, returnDate, cabinClass, maxConnections");

      const response = await this.flightClient.advanceFlightSearch({
        originLocation,
        destinationLocation,
        passengers: passengers || { adults: 1, children: 0, infants: 0 },
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
      const { FlightDetails, passengerType, passengers, maxLayovers, cabinClass, filters, sortBy, flightWay } = req.body;
      if (!FlightDetails || FlightDetails.length == 0 || !maxLayovers || !passengerType || !cabinClass || !flightWay) {
        throw new Error("Missing required fields: FlightDetails, passengerType, maxLayovers, cabinClass, filters, flightWay");
      }
      const response = await this.flightClient.multiCityFlightSearch({
        FlightDetails,
        passengerType,
        maxLayovers,
        passengers: passengers || { adults: 1, children: 0, infants: 0 },
        sortBy: sortBy || "BEST",
        cabinClass,
        filters,
        flightWay
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

  async BookFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { offerId, passengers, contactDetails, address, flight_type, userId } = req.body;
      if (!offerId || !passengers || !contactDetails || !address || !flight_type || !userId) {
        throw new HttpError("Missing required fields: offerId, passengers, contactDetails, address, flight_type, userId", 400);
      }
      const data = await getOffer(offerId);
      if (!data) {
        throw new HttpError("Offer not found", 404);
      }
      const offer = data.data as Offer;
      const pnrs: string[] = [];
      const promises = offer.slices.map(async (slice) => {
        const provider = slice.sourceId;
        switch (provider) {
          case GDS.kiu:
            //@ts-ignore
            this.flightClient.bookKiuFlight(offer, passengers, contactDetails, address, flight_type, userId);
            break;
          case GDS.amadeus:
            //@ts-ignores
            this.flightClient.bookAmadeusFlight(offer, passengers, contactDetails, address, flight_type, userId);
            break;
          case GDS.duffel:
            const pnr = await this.flightClient.bookDuffelFlight(slice, passengers, contactDetails, address, flight_type, userId);
            pnrs.push(pnr);
            break;
          default:
            throw new HttpError("Provider not found", 404);
        }
        return;
      })
      const response = await Promise.all(promises);
      res.status(200).json(pnrs);
    } catch (error) {
      next(error);
    }
  }
}

export default FlightController;
