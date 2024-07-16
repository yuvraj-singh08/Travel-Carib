import Amadus, { Client, FlightOfferSearchParams } from 'amadeus';
import config from '../configs/config';

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
      const response = await this.client.shopping.flightOffersSearch.get(params);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from Amadeus: ' + (error as Error).message);
    }
  }
}

export default AmadeusClient;
