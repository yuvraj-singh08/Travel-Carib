import Amadeus from 'amadeus'
import { amadeusClientType, AmadeusNewSearchParams, FlightOfferSearchParams, multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { amadeusClass } from '../../constants/cabinClass';
import { getGdsCreds } from '../services/GdsCreds.service';
import { cacheAmadeusResponse } from '../services/caching.service';

class AmadeusClient {
  private client: amadeusClientType;

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

  async priceCalendar(params: { origin: string, destination: string, date1: string, date2: string, oneWay?: boolean }): Promise<any> {
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      const payload = {
        origin: params.origin,
        destination: params.destination,
        departureDate: `${params.date1}${params.date2 ? `,${params.date2}` : ''}`,
        oneWay: params.oneWay || false,
      }
      console.log("Payload: ", payload);
      const response = await this.client.shopping.flightDates.get(payload)
      // const priceCalendar = convertToPriceCalendar(response.data);

      return response.data;
    } catch (error) {
      console.log("Price Calendar Error: ", error);
      return { success: false, message: "No data found" };
    }
  }

  async newSearchFlights(params: AmadeusNewSearchParams, index: number): Promise<any> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100 * (index)))
      const response = await this.client.shopping.flightOffersSearch.post(JSON.stringify({
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
                originDestinationIds: [
                  1
                ]
              }
            ],
          }
        }
      }))
      // const savedResponse = await saveAmadeusResponse(response.data);
      return { data: response.data, dictionaries: response.result.dictionaries };
    } catch (error) {
      throw error;
    }
  }

  async searchFlights(params: FlightOfferSearchParams, index: number): Promise<any> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100 * (index)))

      // const response = await this.client.shopping.flightOffersSearch.post(JSON.stringify({
      //   originDestinations: [
      //     {
      //       originLocationCode: params.locationDeparture,
      //       destinationLocationCode: params.locationArrival,
      //       departureDateTimeRange: {
      //         date: params.departure,
      //         // time: "10:00:00"
      //       }
      //     }
      //   ],
      //   searchCriteria: {
      //     addOneWayOffers: true
      //   },
      //   adults: 1,
      // }));

      const response = await this.client.shopping.flightOffersSearch.post(JSON.stringify({
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
      const savedResponse = await cacheAmadeusResponse(response.data);
      return { data: savedResponse, dictionaries: response.result.dictionaries };
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
          // departureDate: new Date().toISOString().split('T')[0],
          departureDateTimeRange: {
            date: departureDate
          },
        }
      })
      console.log(index);
      await new Promise(resolve => setTimeout(resolve, 100 * (index + 1)))
      console.log("Resolved ", index)
      const response = await this.client.shopping.flightOffersSearch.post(JSON.stringify({
        originDestinations: segments,
        // adults: passengers
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
      return { data: response.data, dictionaries: response.result.dictionaries };
    } catch (error) {
      console.log(error)
    }
  }

  async flightPrice(params: FlightOfferSearchParams): Promise<any> {
    try {
      const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.locationDeparture,
        destinationLocationCode: params.locationArrival,
        departureDate: params.departure,
        adults: params.adults,
      });
      const flightOffer = flightOffersSearchResponse.data[0];
      // const flightOffer = flightOffersSearchResponse.data.reduce((min, offer) => offer.price < min.price ? offer : min);
      const flightPricingResponse = await this.client.shopping.flightOffers.pricing.post(
        JSON.stringify({
          'data': {
            'type': 'flight-offers-pricing',
            'flightOffers': [flightOffer],
          }
        }), { include: 'detailed-fare-rules' }
      );

      return flightPricingResponse.data;
    } catch (error) {
      throw error;
    }
  }

  async bookingFlight(amadeusOffer: any, passengers: any[]) {
    try {
      const response = await this.client.booking.flightOrders.post(JSON.stringify({
        data: {
          type: "flight-order",
          flightOffers: [amadeusOffer],
          travelers: passengers,
          // ticketingAgreement:{
          //   option:"DELAY_TO_CANCEL",
          //   delay:"1D"
          // }
        },
      }));
      return response;
    } catch (error) {
      throw error;
    }
  }

  async testBookingApi(params: FlightOfferSearchParams, passengers) {
    try {
      const flightOffersSearchResponse = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.locationDeparture,
        destinationLocationCode: params.locationArrival,
        departureDate: params.departure,
        adults: params.adults,
      });
      const flightOffer = flightOffersSearchResponse.data[0];
      // const flightOffer = flightOffersSearchResponse.data.reduce((min, offer) => offer.price < min.price ? offer : min);
      const flightPricingResponse = await this.client.shopping.flightOffers.pricing.post(
        JSON.stringify({
          'data': {
            'type': 'flight-offers-pricing',
            'flightOffers': [flightOffer]
          }
        }), { include: 'credit-card-fees,detailed-fare-rules' }
      );
      const response = await this.client.booking.flightOrders.post(JSON.stringify({
        data: {
          type: "flight-order",
          flightOffers: [flightPricingResponse.data.flightOffers[0]],
          travelers: passengers
        },
      }));
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export type AmadeusClientInstance = InstanceType<typeof AmadeusClient>;
export default AmadeusClient;
