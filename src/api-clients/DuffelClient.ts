import { Duffel } from '@duffel/api';

class DuffelClient {
  private client: Duffel;

  constructor() {
    this.client = new Duffel({ token: 'your-token' });
  }

  async searchFlights(params: any): Promise<any> {
    try {
      const response = await this.client.offers.list(params);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from Duffel: ' + (error as Error).message);
    }
  }
}

export default DuffelClient;
