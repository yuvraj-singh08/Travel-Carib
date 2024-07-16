import Amadus, { Client } from 'amadeus';
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
        adults: "1"
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  async flightPrice (params: FlightOfferSearchParams): Promise<any> {
    
    try {
      // Perform flight offers search
      const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.locationDeparture,
        destinationLocationCode: params.locationArrival,
        departureDate: params.departure,
        adults: 1
      });
      const flightOffer = flightOffersSearchResponse.data[0]; // This method will select the first offer always
      // The below mentioned method will select the lowest price from the flight offer search
  
      // const flightOffer = flightOffersSearchResponse.data.reduce((min, offer) => offer.price < min.price ? offer : min);
  
      // Perform flight pricing
      const response = await this.client.shopping.flightOffers.pricing.post(
        JSON.stringify({
          'data': {
            'type': 'flight-offers-pricing',
            'flightOffers': [flightOffer]
          }
        }), { include: 'credit-card-fees,detailed-fare-rules' }
      );
  
      // Send response back to client
      return response.data
    } catch (error) {
      throw error;
    }
  }
}

export default AmadeusClient;
