import Amadeus from 'amadeus'
import { amadeusClientType, AmadeusNewSearchParams, FlightOfferSearchParams, multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { amadeusClass } from '../../constants/cabinClass';
import { getGdsCreds } from '../services/GdsCreds.service';
import { cacheAmadeusResponse } from '../services/caching.service';

// Define the request queue item interface
interface QueueItem {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class AmadeusClient {
  private client: amadeusClientType;
  private requestQueue: QueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private queueInterval: number = 20; // 250ms between requests to prevent rate limiting

  public constructor(creds: {
    clientId: string,
    clientSecret: string,
    hostname: 'test' | 'production'
  }) {
    this.client = new Amadeus(creds);
  }

  static async create(): Promise<AmadeusClient> {
    try {
      // Fetch API credentials from DB
      const creds = await getGdsCreds('AMADEUS');

      if (!creds) {
        throw new Error("Amadeus credentials not found in DB");
      }

      const client = new AmadeusClient({
        clientId: creds.mode === 'PRODUCTION' ? creds.productionApiKey : creds.testApiKey,
        clientSecret: creds.mode === 'PRODUCTION' ? creds.productionApiSecret : creds.testApiSecret,
        hostname: creds.mode.toLowerCase() as 'test' | 'production',
      });

      return client;
    } catch (error) {
      console.error("Failed to initialize Amadeus client:", error);
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
      
      execute()
        .then(response => {
          resolve(response);
          setTimeout(() => {
            processNextRequest();
          }, this.queueInterval);
        })
        .catch(error => {
          reject(error);
          setTimeout(() => {
            processNextRequest();
          }, this.queueInterval);
        });
    };

    processNextRequest();
  }

  async citySearch(query: string, subType: string) {
    try {
      return this.enqueueRequest(() => 
        this.client.referenceData.locations.get({
          keyword: query,
          subType: subType
        })
        .then(response => response.body)
      );
    } catch (error) {
      console.log("Failed to fetch city search", error)
      throw error
    }
  }

  async priceCalendar(params: { origin: string, destination: string, date1: string, date2: string, oneWay?: boolean }): Promise<any> {
    try {
      const payload = {
        origin: params.origin,
        destination: params.destination,
        departureDate: `${params.date1}${params.date2 ? `,${params.date2}` : ''}`,
        oneWay: params.oneWay || false,
      }
      
      return this.enqueueRequest(() => {
        console.log("Payload: ", payload);
        return this.client.shopping.flightDates.get(payload)
          .then(response => response.data);
      });
    } catch (error) {
      console.log("Price Calendar Error: ", error);
      return { success: false, message: "No data found" };
    }
  }

  async newSearchFlights(params: AmadeusNewSearchParams): Promise<any> {
    try {
      return this.enqueueRequest(() => {
        return this.client.shopping.flightOffersSearch.post(JSON.stringify({
          currencyCode: process.env.ISOCurrency || "USD",
          originDestinations: params.originDestinations,
          travelers: params.passengers,
          sources: [
            "GDS"
          ],
          searchCriteria: {
            maxFlightOffers: 50,
            flightFilters: {
              cabinRestrictions: [
                {
                  cabin: amadeusClass[params.cabinClass],
                  coverage: "MOST_SEGMENTS",
                  originDestinationIds: params.originDestinationIds || [
                    1
                  ]
                }
              ],
            }
          }
        }))
        .then(response => ({ data: response.data, dictionaries: response.result.dictionaries }));
      });
    } catch (error) {
      throw error;
    }
  }

  async searchFlights(params: FlightOfferSearchParams): Promise<any> {
    try {
      return this.enqueueRequest(() => {
        return this.client.shopping.flightOffersSearch.post(JSON.stringify({
          currencyCode: process.env.ISOCurrency || "USD",
          originDestinations: [
            {
              id: 1,
              originLocationCode: params.locationDeparture,
              destinationLocationCode: params.locationArrival,
              departureDateTimeRange: {
                date: params.departure,
              }
            },
          ],
          travelers: params.passengers,
          sources: [
            "GDS"
          ],
          searchCriteria: {
            maxFlightOffers: 50,
            flightFilters: {
              cabinRestrictions: [
                {
                  cabin: amadeusClass[params.cabinClass],
                  coverage: "MOST_SEGMENTS",
                  originDestinationIds: [
                    1
                  ]
                }
              ],
            }
          }
        }))
        .then(async response => {
          const savedResponse = await cacheAmadeusResponse(response.data);
          return { data: savedResponse, dictionaries: response.result.dictionaries };
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async multiCityFlightSearch({ routeSegments, departureDate, passengers, index }: multiCityFlightSearchParams): Promise<any> {
    try {
      const segments = routeSegments.map((routeSegment, index) => {
        return {
          id: index + 1,
          originLocationCode: routeSegment.origin,
          destinationLocationCode: routeSegment.destination,
          departureDateTimeRange: {
            date: departureDate
          },
        }
      });
      
      return this.enqueueRequest(() => {
        console.log("Processing multi-city flight search, index:", index);
        return this.client.shopping.flightOffersSearch.post(JSON.stringify({
          originDestinations: segments,
          travelers: [
            {
              "id": "1",
              "travelerType": "ADULT",
              "fareOptions": [
                "STANDARD"
              ]
            },
            {
              "id": "2",
              "travelerType": "CHILD",
              "fareOptions": [
                "STANDARD"
              ]
            }
          ],
          sources: [
            "GDS"
          ],
        }))
        .then(response => ({ data: response.data, dictionaries: response.result.dictionaries }));
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async flightPrice(params: FlightOfferSearchParams): Promise<any> {
    try {
      return this.enqueueRequest(async () => {
        const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
          originLocationCode: params.locationDeparture,
          destinationLocationCode: params.locationArrival,
          departureDate: params.departure,
          adults: params.adults,
        });
        
        const flightOffer = flightOffersSearchResponse.data[0];
        const flightPricingResponse = await this.client.shopping.flightOffers.pricing.post(
          JSON.stringify({
            'data': {
              'type': 'flight-offers-pricing',
              'flightOffers': [flightOffer],
            }
          }), { include: 'detailed-fare-rules' }
        );

        return flightPricingResponse.data;
      });
    } catch (error) {
      throw error;
    }
  }

  async bookingFlight(amadeusOffer: any, passengers: any[]): Promise<any> {
    try {
      return this.enqueueRequest(() => 
        this.client.booking.flightOrders.post(JSON.stringify({
          data: {
            type: "flight-order",
            flightOffers: [amadeusOffer],
            travelers: passengers,
          },
        }))
      );
    } catch (error) {
      throw error;
    }
  }

  async testBookingApi(params: FlightOfferSearchParams, passengers) {
    try {
      return this.enqueueRequest(async () => {
        const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
          originLocationCode: params.locationDeparture,
          destinationLocationCode: params.locationArrival,
          departureDate: params.departure,
          adults: params.adults,
        });
        
        const flightOffer = flightOffersSearchResponse.data[0];
        const flightPricingResponse = await this.client.shopping.flightOffers.pricing.post(
          JSON.stringify({
            'data': {
              'type': 'flight-offers-pricing',
              'flightOffers': [flightOffer]
            }
          }), { include: 'credit-card-fees,detailed-fare-rules' }
        );
        
        return this.client.booking.flightOrders.post(JSON.stringify({
          data: {
            type: "flight-order",
            flightOffers: [flightPricingResponse.data.flightOffers[0]],
            travelers: passengers
          },
        }));
      });
    } catch (error) {
      throw error;
    }
  }
}

export type AmadeusClientInstance = InstanceType<typeof AmadeusClient>;
export default AmadeusClient;