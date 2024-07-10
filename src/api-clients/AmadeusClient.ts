import { Client, FlightOfferSearchParams } from 'amadeus';

class AmadeusClient {
  private client:Client;

  constructor() {
    this.client = new Client({
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret'
    });
  }

  async searchFlights(params:FlightOfferSearchParams): Promise<any> {
    try {
      const response = await this.client.shopping.flightOffersSearch.get(params);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from Amadeus: ' + (error as Error).message);
    }
  }
}

export default AmadeusClient;
