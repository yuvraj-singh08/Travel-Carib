import { Duffel } from '@duffel/api';
import { CreateOfferRequest, OfferRequest } from '@duffel/api/types';
import { DuffelCreateOrderParams } from '../../types/duffelTypes';
import { getGdsCreds } from '../services/GdsCreds.service';
import { DuffelResponse } from '@duffel/api/types/ClientType';

// Define the request queue item interface
interface QueueItem {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class DuffelClient {
  private client: Duffel;
  private requestQueue: QueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private queueInterval: number = 20; // 50ms between requests

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

  // Method to add a request to the queue
  private enqueueRequest<T>(executeFunction: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ 
        execute: executeFunction, 
        resolve, 
        reject 
      });
      this.processQueue();
    });
  }

  // Method to process the request queue
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    const processNextRequest = () => {
      if (this.requestQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const { execute, resolve, reject } = this.requestQueue.shift()!;
      
      setTimeout(() => {
        processNextRequest();
      }, this.queueInterval);
      execute()
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    };

    processNextRequest();
  }

  async createOfferRequest(offerRequestData: CreateOfferRequest): Promise<DuffelResponse<OfferRequest>> {
    try {
      return this.enqueueRequest(() => this.client.offerRequests.create(offerRequestData));
    } catch (error) {
      console.log("Duffel Error: ");
      console.log(error);
      return {
        data:{
          id: "",
          slices: [],
          offers: [],
          live_mode: true,
          passengers:[],
          cabin_class: "economy",
          created_at:"1265"
        }
      }
    }
  }

  async getOfferRequestById(id: string) {
    try {
      return this.enqueueRequest(() => this.client.offerRequests.get(id));
    } catch (error) {
      throw error;
    }
  }

  async getFlightDetails(id: string) {
    try {
      return this.enqueueRequest(() => this.client.airlines.get(id));
    } catch (error) {
      throw error;
    }
  }

  async searchFlights(params: any): Promise<any> {
    try {
      const response = await this.enqueueRequest(() => this.client.offers.list(params));
      return response.data;
    } catch (error) {
      throw new Error('Error fetching flights from Duffel: ' + (error as Error).message);
    }
  }

  async createOrder(params: DuffelCreateOrderParams): Promise<any> {
    try {
      return this.enqueueRequest(() => 
        this.client.orders.create({
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
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAvailableServices(offerId: string): Promise<any> {
    try {
      const response = await this.enqueueRequest(() => 
        this.client.offers.get(offerId, {
          return_available_services: true
        })
      );
      return response.data.available_services;
    } catch (error) {
      throw error;
    }
  }
}

export type DuffelClientInstance = InstanceType<typeof DuffelClient>;
export default DuffelClient;