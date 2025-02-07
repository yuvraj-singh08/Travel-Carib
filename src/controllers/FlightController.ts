import { NextFunction, Request, Response } from 'express';
import FlightClient, { FlightClientInstance } from '../api-clients/FlightClient';
import { promises } from 'dns';
import { getPossibleRoutes } from '../utils/flights';
import HttpError from '../utils/httperror';
import { getOffer } from '../services/OfferService';
import { MulticityOffer, Offer, SubBookingType } from '../../types/flightTypes';
import { flightTypeValue, GDS, SubBookingStatusValues } from '../../constants/cabinClass';
import { createBookingService } from '../services/Booking.service';
import { AuthenticatedRequest } from '../../types/express';

class FlightController {
  private flightClient: FlightClientInstance;

  constructor(flightClient: FlightClientInstance) {
    this.flightClient = flightClient;
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
        passengers: {
          adults: parseInt(passengers?.adults) || 1,
          children: parseInt(passengers?.children) || 0,
          infants: parseInt(passengers?.infants) || 0,
        },
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

  async BookFlight(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { offerId, passengers, flight_type, contactDetails } = req.body;
      if (!offerId || !passengers || !flight_type || !userId) {
        throw new HttpError("Missing required fields: offerId, passengers, contactDetails, address, flight_type, userId", 400);
      }
      const data = await getOffer(offerId);
      if (!data) {
        throw new HttpError("Offer not found", 404);
      }

      if (data.flightWay === flightTypeValue.oneway) {
        const offer = data.data as Offer;
        const subBookings: SubBookingType[] = [];
        let pnr;
        const promises = offer.slices.map(async (slice, index) => {
          const provider = slice.sourceId;
          switch (provider) {
            case GDS.kiu:
              //@ts-ignore
              await this.flightClient.bookKiuFlight(offer, passengers);
              break;
            case GDS.amadeus:
              pnr = await this.flightClient.bookAmadeusFlight(slice.gdsOfferId, passengers);
              subBookings.push({
                pnr,
                status: SubBookingStatusValues.pending,
              });
              return {
                ...slice,
                PNR: (pnr)
              }
              break;
            case GDS.duffel:
              pnr = await this.flightClient.bookDuffelFlight(slice, passengers, index)
              subBookings.push({
                pnr,
                status: SubBookingStatusValues.pending,
              });
              return {
                ...slice,
                PNR: pnr
              }
              break;
            default:
              throw new HttpError("Provider not found", 404);
          }
          return { ...slice, PNR: "Not Found" };
        })
        const modifiedSlices = await Promise.all(promises);
        const bookingResponse = await createBookingService({
          flightData: { ...offer, slices: modifiedSlices },
          passengers,
          flightType: flight_type,
          userId,
          contactDetails,
          subBookings
        })
        res.status(200).json(bookingResponse);
      }
      else {

        const offer = data.data as MulticityOffer;

        const subBookings = [];
        let index = 0;
        let pnr;
        const modifiedItenaries = await Promise.all(offer.itenaries.map(async (itenary) => {
          const modifiedSlices = await Promise.all(itenary.slices.map(async (slice) => {
            const provider = slice.sourceId;
            switch (provider) {
              case GDS.kiu:
                //@ts-ignore
                await this.flightClient.bookKiuFlight(offer, passengers);
                break;
              case GDS.amadeus:
                pnr = await this.flightClient.bookAmadeusFlight(slice.gdsOfferId, passengers);
                subBookings.push({
                  pnr,
                  status: SubBookingStatusValues.pending,
                });
                return {
                  ...slice,
                  PNR: (pnr)
                }
                break;
              case GDS.duffel:
                pnr = await this.flightClient.bookDuffelFlight(slice, passengers, index)
                subBookings.push({
                  pnr,
                  status: SubBookingStatusValues.pending,
                });
                return {
                  ...slice,
                  PNR: pnr
                }
                break;
              default:
                throw new HttpError("Provider not found", 404);
            }
            subBookings.push({
              pnr: "Not Found",
              status: SubBookingStatusValues.pending,
              ticketNumber: index++,
            })
            return { ...slice, PNR: "Not Found" };
          }))
          return { ...itenary, slices: modifiedSlices }
        }))

        const bookingResponse = await createBookingService({
          flightData: { ...offer, itenaries: modifiedItenaries },
          passengers,
          flightType: flight_type,
          userId,
          contactDetails,
          subBookings
        })
        res.status(200).json(bookingResponse);
      }

    } catch (error) {
      next(error);
    }
  }
}

export default FlightController;
