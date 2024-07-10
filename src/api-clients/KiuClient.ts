import axios from 'axios';

class KiuClient {
  private endpoint: string;

  constructor() {
    this.endpoint = 'your-kiu-endpoint';
  }

  async searchFlights(params: any): Promise<any> {
    try {
      const response = await axios.post(this.endpoint, params, {
        headers: { 'Content-Type': 'application/xml' }
      });
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from KIU: ' + (error as Error).message);
    }
  }
}

export default KiuClient;
