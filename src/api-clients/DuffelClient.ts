import { Duffel } from '@duffel/api';
import { CreateOfferRequest } from '@duffel/api/types';
import { DuffelCreateOrderParams } from '../../types/duffelTypes';
import { getGdsCreds } from '../services/GdsCreds.service';

class DuffelClient {
  private client: Duffel;

  constructor(creds: { token: string }) {
    this.client = new Duffel(creds);
    this.getFlightDetails = this.getFlightDetails.bind(this);
  }

  static async create(): Promise<DuffelClient> {
    try {
      // Fetch API credentials from DB
      const creds = await getGdsCreds('DUFFEL');

      if (!creds) {
        throw new Error("Duffel credentials not found in DB");
      }

      const client = new DuffelClient({
        token: creds.mode === 'PRODUCTION' ? creds.productionApiKey : creds.testApiKey,
      });

      return client;
    } catch (error) {
      console.error("Failed to initialize Duffel client:", error);
      throw error;
    }
  }

  async createOfferRequest(offerRequestData: CreateOfferRequest) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100 * (Math.random())))
      const createdOfferRequest = await this.client.offerRequests.create(offerRequestData);
      return createdOfferRequest
    } catch (error) {
      throw error
    }
  }

  async getOfferRequestById(id: string) {
    try {
      const offerRequest = await this.client.offerRequests.get(id);
      return offerRequest;
    } catch (error) {
      throw error
    }
  }

  async getFlightDetails(id: string) {
    try {
      const flightDetails = await this.client.airlines.get(id);
      return flightDetails;
    } catch (error) {
      throw error;
    }
  }

  async searchFlights(params: any): Promise<any> {
    try {
      const response = await this.client.offers.list(params);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from Duffel: ' + (error as Error).message);
    }
  }

  async createOrder(params: DuffelCreateOrderParams): Promise<any> {
    try {
      const response = await this.client.orders.create({
        type: "instant",
        services: params.services,
        selected_offers: [
          params.offerId
        ],
        passengers: params.passengers,
        payments: [
          {
            type: "balance",
            currency: "USD",
            amount: params.totalAmount
          }
        ],
      })
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAvailableServices(offerId: string): Promise<any> {
    try {
      const response = await this.client.offers.get(offerId, {
        return_available_services: true
      })
      return response.data.available_services;
    } catch (error) {
      throw error;
    }
  }
}
export type DuffelClientInstance = InstanceType<typeof DuffelClient>;
export default DuffelClient;
