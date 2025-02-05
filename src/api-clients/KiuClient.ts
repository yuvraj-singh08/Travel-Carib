import axios, { AxiosInstance } from 'axios';
import { buildFlightPriceRequest, buildFlightSearchRequest, bulidMultiCityFlightSearchRequest, combineFlightsWithMinimumLayover, getDateString, parseFlightSearchResponse, parseKiuResposne } from '../utils/kiu';
import xml2js from 'xml2js';
import { FlightSearchParams, PriceRequestBuilderParams } from '../../types/kiuTypes';
import { multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { kiuClasses } from '../../constants/cabinClass';
import { CommissionType } from '../../types/flightTypes';
import { getGdsCreds } from '../services/GdsCreds.service';
import { capitalizeFirstLetter } from '../utils/utils';

class KiuClient {
  private endpoint: string;
  private axiosInstance: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private mode: 'Test' | 'Production';

  constructor(creds: { clientId: string; clientSecret: string, mode: 'Test' | 'Production' }) {
    this.clientId = creds.clientId;
    this.clientSecret = creds.clientSecret;
    this.mode = creds.mode;

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

  static async create(): Promise<KiuClient> {
    try {
      // Fetch API credentials from DB
      const creds = await getGdsCreds('KIU');

      if (!creds) {
        throw new Error("Amadeus credentials not found in DB");
      }

      const client = new KiuClient({
        clientId: creds.mode === 'PRODUCTION' ? creds.productionApiKey : creds.testApiKey,
        clientSecret: creds.mode === 'PRODUCTION' ? creds.productionApiSecret : creds.testApiSecret,
        mode: capitalizeFirstLetter(creds.mode.toLowerCase()) as 'Test' | 'Production',
      });

      return client;
    } catch (error) {
      console.error("Failed to initialize Amadeus client:", error);
      throw error;
    }
  }

  async searchFlights(params: FlightSearchParams, firewall: any, commission: CommissionType): Promise<any> {
    try {
      const invalidResponseIndexs = [];
      const DepartureDate = getDateString(params.DepartureDate)
      const requestXML = buildFlightSearchRequest({ ...params, DepartureDate: DepartureDate }, this.mode);
      const response = await this.axiosInstance.post('', {
        user: this.clientId,
        password: this.clientSecret,
        request: requestXML
      })
      // console.log("KIU response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      const parsedResponse = parseKiuResposne(jsonResponse, firewall, params.tripOrigin, params.tripDestination);
      const cabinClass = kiuClasses[params.CabinClass];
      const priceRequestPromises = parsedResponse?.map(async (offer, offerIndex) => {
        let sliceSum = 0;
        const sliceResponse = await Promise.allSettled(
          offer?.slices?.map(async (slice, sliceIndex) => {
            let segmentSum = 0
            const segmentResponse = await Promise.allSettled(
              slice?.segments?.map(async (segment, segmentIndex) => {
                let flag = false;
                let code = null;
                segment?.bookingAvl?.forEach((bookingAvl) => {
                  if (parseInt(bookingAvl.quantity) > 0 && ((params.CabinClass === 'economy' || params.CabinClass === 'premium_economy') && (!kiuClasses.business.includes(bookingAvl.code) && !kiuClasses.first.includes(bookingAvl.code))) || cabinClass.includes(bookingAvl.code)) {
                    flag = true;
                    code = bookingAvl.code;
                  }
                })
                if (!flag) {
                  invalidResponseIndexs.push(offerIndex);
                  return null;
                }
                const priceResponse = await this.searchPrice({
                  OriginLocation: segment?.origin?.iata_code,
                  DestinationLocation: segment?.destination?.iata_code,
                  DepartureDateTime: segment?.departing_at,
                  ArrivalDateTime: segment?.arriving_at,
                  MarketingAirline: segment?.operating_carrier?.iata_code,
                  FlightNumber: segment?.operating_carrier_flight_number,
                  Passengers: params.Passengers,
                  ResBookDesigCode: code
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
        let commissionAmount = 0;
        if (commission) {
          if (commission.feeType === 'FIXED') {
            commissionAmount = parseFloat(commission.commissionFees);
          }
          else {
            commissionAmount = (sliceSum * parseFloat(commission.commissionFees)) / 100.00;
          }
        }
        parsedResponse[offerIndex].total_amount = (sliceSum === 0 ? 999999 : sliceSum + commissionAmount).toString();
        parsedResponse[offerIndex].commissionAmount = commissionAmount;
        return {
          ...sliceResponse,
          sliceSum
        };
      });

      // Execute all price requests concurrently
      const priceResponse = await Promise.allSettled(priceRequestPromises)

      const filteredResponse = parsedResponse.filter((parsedResponse, index) => !invalidResponseIndexs.includes(index));

      return filteredResponse
    } catch (error) {
      throw error;
    }
  }

  async searchPrice(params: PriceRequestBuilderParams) {
    try {
      const requestXML = buildFlightPriceRequest(params, this.mode);
      // console.log("Price Request: ", requestXML);
      const response = await this.axiosInstance.post('', {
        user: this.clientId,
        password: this.clientSecret,
        request: requestXML
      })
      // console.log("Price Response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      return jsonResponse
    } catch (error) {
      throw error;
    }
  }

  async multiCitySearch({ routeSegments, departureDate, passengers }: multiCityFlightSearchParams): Promise<any> {
    try {
      const requestXML = bulidMultiCityFlightSearchRequest({ routeSegments, departureDate, passengers }, this.mode);
      const response = await this.axiosInstance.post('', {
        user: this.clientId,
        password: this.clientSecret,
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

  async priceCalendar() {
    try {

    } catch (error) {

    }
  }
}

export type KiuClientInstance = InstanceType<typeof KiuClient>
export default KiuClient;