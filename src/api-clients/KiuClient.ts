import axios, { AxiosInstance } from 'axios';
import { buildFlightPriceRequest, buildFlightSearchRequest, bulidMultiCityFlightSearchRequest, combineFlightsWithMinimumLayover, getDateString, parseFlightSearchResponse, parseKiuResposne } from '../utils/kiu';
import xml2js from 'xml2js';
import { FlightSearchParams, PriceRequestBuilderParams } from '../../types/kiuTypes';
import { multiCityFlightSearchParams } from '../../types/amadeusTypes';

class KiuClient {
  private endpoint: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.endpoint = 'your-kiu-endpoint';
    const baseURL = "https://ssl00.kiusys.com/ws3/index.php";

    this.axiosInstance = axios.create({
      baseURL: `${baseURL}`, // Base URL for all requests
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded' // Default content type
      },
    })

    this.searchFlights = this.searchFlights.bind(this);
  }

  async searchFlights(params: FlightSearchParams): Promise<any> {
    try {
      const DepartureDate = getDateString(params.DepartureDate)
      const requestXML = buildFlightSearchRequest({ ...params, DepartureDate: DepartureDate });
      const response = await this.axiosInstance.post('', {
        user: process.env.KIU_USER,
        password: process.env.KIU_PASSWORD,
        request: requestXML
      })
      console.log("KIU response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      const parsedResponse = await parseKiuResposne(jsonResponse);
      const priceRequestPromises = parsedResponse?.map(async (offer, offerIndex) => {
        let sliceSum = 0;
        const sliceResponse = await Promise.allSettled(
          offer?.slices?.map(async (slice, sliceIndex) => {
            let segmentSum = 0
            const segmentResponse = await Promise.allSettled(
              slice?.segments?.map(async (segment, segmentIndex) => {
                const priceResponse = await this.searchPrice({
                  OriginLocation: segment?.origin?.iata_code,
                  DestinationLocation: segment?.destination?.iata_code,
                  DepartureDateTime: segment?.departing_at,
                  ArrivalDateTime: segment?.arriving_at,
                  MarketingAirline: segment?.marketing_carrier?.iata_code,
                  FlightNumber: segment?.marketing_carrier_flight_number,
                  Passengers: params.Passengers,
                  ResBookDesigCode: segment?.bookingAvl?.[0]?.code
                });

                const pi = priceResponse?.KIU_AirPriceRS?.PricedItineraries?.[0];
                const py = pi?.PricedItinerary?.[0];
                const itf = py?.AirItineraryPricingInfo?.[0]?.ItinTotalFare?.[0];
                const total_amount = itf?.TotalFare?.[0]?.$?.Amount;

                if (total_amount) {
                  segmentSum += parseFloat(total_amount);
                }

                // Update the parsedResponse with the price data
                parsedResponse[offerIndex].slices[sliceIndex].segments[segmentIndex].segmentPrice = total_amount;
                return priceResponse;
              })
            );
            if (segmentSum) {
              sliceSum += segmentSum;
            }
            return {
              ...segmentResponse,
              segmentSum
            };
          })
        );
        parsedResponse[offerIndex].total_amount = sliceSum === 0 ? 999999 : sliceSum;
        return {
          ...sliceResponse,
          sliceSum
        };
      });

      // Execute all price requests concurrently
      const priceResponse = await Promise.allSettled(priceRequestPromises)

      return parsedResponse
    } catch (error) {
      throw error;
    }
  }

  async searchPrice(params: PriceRequestBuilderParams) {
    try {
      const requestXML = buildFlightPriceRequest(params);
      const response = await this.axiosInstance.post('', {
        user: process.env.KIU_USER,
        password: process.env.KIU_PASSWORD,
        request: requestXML
      })
      console.log("Price Response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      return jsonResponse
    } catch (error) {
      throw error;
    }
  }

  async multiCitySearch({ routeSegments, departureDate, passengers }: multiCityFlightSearchParams): Promise<any> {
    try {
      const requestXML = bulidMultiCityFlightSearchRequest({ routeSegments, departureDate, passengers })
      const response = await this.axiosInstance.post('', {
        user: process.env.KIU_USER,
        password: process.env.KIU_PASSWORD,
        request: requestXML
      })
      // console.log(response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      // const parsedResponse = combineFlightsWithMinimumLayover(jsonResponse);
      // const parsedResponse = await parseFlightSearchResponse(jsonResponse);
      // const parsedResponse = parseKiuResposne(jsonResponse);
      return jsonResponse;
    } catch (error) {
      throw error
    }
  }
}

export type KiuClientInstance = InstanceType<typeof KiuClient>
export default KiuClient;