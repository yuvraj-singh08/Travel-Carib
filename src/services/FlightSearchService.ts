import AmadeusClient from '../api-clients/AmadeusClient';
import DuffelClient from '../api-clients/DuffelClient';
import KiuClient from '../api-clients/KiuClient';
import ResponseFormatter from '../utils/ResponseFormatter';

class FlightSearchService {
  private amadeusClient: AmadeusClient;
  private duffelClient: DuffelClient;
  private kiuClient: KiuClient;

  constructor() {
    this.amadeusClient = new AmadeusClient();
    this.duffelClient = new DuffelClient();
    this.kiuClient = new KiuClient();
  }

  async searchFlights(params: any): Promise<any> {
    try {
      const [amadeusData, duffelData, kiuData] = await Promise.all([
        this.amadeusClient.searchFlights(params),
        this.duffelClient.searchFlights(params),
        this.kiuClient.searchFlights(params)
      ]);

      const formattedAmadeusData = ResponseFormatter.formatAmadeus(amadeusData);
      const formattedDuffelData = ResponseFormatter.formatDuffel(duffelData);
      const formattedKiuData = ResponseFormatter.formatKiu(kiuData);

      return [...formattedAmadeusData, ...formattedDuffelData, ...formattedKiuData];
    } catch (error: any) {
      throw new Error('Error searching flights: ' + error.message);
    }
  }
}

export default FlightSearchService;
