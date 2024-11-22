import Amadus from 'amadeus'
import config from '../configs/config';
import { amadeusClientType, FlightOfferSearchParams, multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { routeType } from '../../types/flightTypes';

class AmadeusClient {
  private client: amadeusClientType;

  constructor() {
    this.client = new Amadus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      hostname: 'production'
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

  async priceCalendar(params: { origin: string, destination: string, date1: string, date2: string }): Promise<any> {
    const response = await this.client.shopping.flightDates.get({
      origin: params.origin,
      destination: params.destination,
      departureDate: `${params.date1}${params.date2 && `,${params.date2}`}`
    })
    return response.data;
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
        currencyCode: "EUR",
        originDestinations: [
          {
            id: 1,
            originLocationCode: params.locationDeparture,
            destinationLocationCode: params.locationArrival,
            departureDateTimeRange: {
              date: params.departure,
              // time: 10:00:00
            }
          },
        ],
        travelers: [
          {
            id: 1,
            travelerType: "ADULT",
            fareOptions: [
              "STANDARD"
            ]
          },

        ],
        sources: [
          "GDS"
        ],
        searchCriteria: {
          maxFlightOffers: 50,
          flightFilters: {
            cabinRestrictions: [
              {
                cabin: "ECONOMY",
                coverage: "MOST_SEGMENTS",
                originDestinationIds: [
                  1
                ]
              }
            ],
            // carrierRestrictions: {
            //   excludedCarrierCodes: [
            //     AA,
            //     TP,
            //     AZ
            //   ]
            // }
          }
        }
      }))
      return { data: response.data, dictionaries: response.result.dictionaries };
    } catch (error) {
      console.log(error);
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
            'flightOffers': [flightOffer]
          }
        }), { include: 'credit-card-fees,detailed-fare-rules' }
      );

      return flightPricingResponse.data;
    } catch (error) {
      throw error;
    }
  }
}

export type AmadeusClientInstance = InstanceType<typeof AmadeusClient>;
export default AmadeusClient;
