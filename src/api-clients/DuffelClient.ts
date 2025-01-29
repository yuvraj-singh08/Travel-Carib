import { Duffel } from '@duffel/api';
import { CreateOfferRequest, OfferAvailableServiceBaggage } from '@duffel/api/types';
import { DuffelCreateOrderParams } from '../../types/duffelTypes';
import { AxiosInstance } from 'axios';

class DuffelClient {
  private client: Duffel;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.client = new Duffel({ token: process.env.DUFFEL_TOKEN });
    this.getFlightDetails = this.getFlightDetails.bind(this);
  }

  async createOfferRequest(offerRequestData: CreateOfferRequest) {
    try {
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
        type: "pay_later",
        services: params.services,
        selected_offers: [
          params.offerId
        ],
        passengers: params.passengers
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
