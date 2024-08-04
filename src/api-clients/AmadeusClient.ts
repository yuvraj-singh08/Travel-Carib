import Amadus, { Client } from 'amadeus'
import config from '../configs/config';
import { FlightOfferSearchParams } from '../../types/amadeusTypes';

class AmadeusClient {
  private client: Client;

  constructor() {
    this.client = new Amadus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret:process.env.AMADEUS_CLIENT_SECRET
    });
  }

  async citySearch(query: string, subType: string) {
    try {
      const response = await this.client.referenceData.locations.get({
        keyword: query,
        subType: subType
      });

      return response.body
    } catch (error) {
      console.log("Failed to fetch city search", error)
      throw error
    }
  }

  async searchFlights(params: FlightOfferSearchParams): Promise<any> {
    try {
      const response = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.locationDeparture,
        destinationLocationCode: params.locationArrival,
        departureDate: params.departure,
        adults: params.adults,
      });
      await new Promise(resolve => setTimeout(resolve,50 ))
      return {data: response.data, dictionaries: response.result.dictionaries};
    } catch (error) {
      console.log(error);
    }
  }

  async flightPrice(params: FlightOfferSearchParams): Promise<any> {
    try {
      const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.locationDeparture,
        destinationLocationCode: params.locationArrival,
        departureDate: params.departure,
        adults: params.adults,
      });
      const flightOffer = flightOffersSearchResponse.data[0];
      // const flightOffer = flightOffersSearchResponse.data.reduce((min, offer) => offer.price < min.price ? offer : min);
      const flightPricingResponse = await this.client.shopping.flightOffers.pricing.post(
        JSON.stringify({
          'data': {
            'type': 'flight-offers-pricing',
            'flightOffers': [flightOffer]
          }
        }), { include: 'credit-card-fees,detailed-fare-rules' }
      );

      return flightPricingResponse.data;
    } catch (error) {
      throw error;
    }
  }
}

export type AmadeusClientInstance = InstanceType<typeof AmadeusClient>;
export default AmadeusClient;
