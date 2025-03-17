import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { buildBookingRequest, buildFlightPriceRequest, buildFlightSearchRequest, buildNewPriceRequest, bulidMultiCityFlightSearchRequest, combineKiuRoutes, getDateString, newbuildFlightSearchRequest, newKiuParser, normalizeKiuResponse, parseFlightSearchResponse, parseKiuResposne } from '../utils/kiu';
import xml2js from 'xml2js';
import { BookingRequestParams, FlightSearchParams, KiuJsonResponseType, NewKiuFlightSearchParams, PriceRequestBuilderParams, PriceRequestParams } from '../../types/kiuTypes';
import { multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { kiuClasses } from '../../constants/cabinClass';
import { CommissionType, Offer, Slice } from '../../types/flightTypes';
import { getGdsCreds } from '../services/GdsCreds.service';
import { capitalizeFirstLetter } from '../utils/utils';
import HttpError from '../utils/httperror';

interface Payload {
  user: string;
  password: string;
  request: string;
}
interface QueueItem {
  payload: Payload;
  resolve: (value: AxiosResponse) => void;
  reject: (error: any) => void;
}

class KiuClient {
  private endpoint: string;
  private axiosInstance: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private mode: 'Testing' | 'Production';
  private requestQueue: QueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private queueInterval: number = 20; // 50ms between requests

  constructor(creds: { clientId: string; clientSecret: string, mode: 'Testing' | 'Production' }) {
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
      let mode = capitalizeFirstLetter(creds.mode.toLowerCase())
      if (mode === "Test") {
        mode = 'Testing';
      }

      const client = new KiuClient({
        clientId: creds.mode === 'PRODUCTION' ? creds.productionApiKey : creds.testApiKey,
        clientSecret: creds.mode === 'PRODUCTION' ? creds.productionApiSecret : creds.testApiSecret,
        mode: mode as 'Testing' | 'Production',
      });

      return client;
    } catch (error) {
      console.error("Failed to initialize Amadeus client:", error);
      throw error;
    }
  }

  private enqueueRequest(payload: Payload): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ payload, resolve, reject });
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

      const { payload, resolve, reject } = this.requestQueue.shift()!;

      this.axiosInstance.post('', payload)
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

  // Queued version of axios post
  private async queuedPost(requestXML: string): Promise<AxiosResponse> {
    const config = {
      user: this.clientId,
      password: this.clientSecret,
      request: requestXML
    };

    return this.enqueueRequest(config);
  }

  async searchFlights(params: FlightSearchParams, firewall: any, commission: CommissionType): Promise<any> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000 * (Math.random())))
      const invalidResponseIndexs = [];
      const DepartureDate = getDateString(params.DepartureDate)
      const requestXML = buildFlightSearchRequest({ ...params, DepartureDate: DepartureDate }, this.mode);
      const response = await this.queuedPost(requestXML);
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
                  if (flag)
                    return;
                  if (parseInt(bookingAvl.quantity) > (params.Passengers.adults + params.Passengers.children + params.Passengers.infants)) {
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
                if (!total_amount) {
                  console.log("KIU Price Error");
                }
                if (total_amount) {
                  segmentSum += parseFloat(total_amount);
                }

                // Update the parsedResponse with the price data
                parsedResponse[offerIndex].slices[sliceIndex].segments[segmentIndex].segmentPrice = total_amount;
                parsedResponse[offerIndex].slices[sliceIndex].segments[segmentIndex].ResBookDesigCode = code;
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
      if (error?.response?.status === 509) {
        console.log("KIU's request limit exceeded");
        return [];
      }
      console.log(error);
      return []
    }
  }

  async newSearchFlights(params: NewKiuFlightSearchParams): Promise<any> {
    try {
      const requestXML = newbuildFlightSearchRequest(params, this.mode);
      const response = await this.queuedPost(requestXML);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data) as { KIU_AirAvailRS: KiuJsonResponseType };
      //@ts-ignore
      if (jsonResponse?.Root?.Error) {
        console.log(jsonResponse);
        throw new HttpError("Error in KIU response check server log", 500);
      }
      const RPH = kiuClasses?.[`${params.CabinClass}`]
      const itenaries = jsonResponse.KIU_AirAvailRS?.OriginDestinationInformation?.map((OriginDestinationInformation) => {
        //@ts-ignores
        if (OriginDestinationInformation?.OriginDestinationOptions?.[0] === "\n\t\t") {
          return []
        }
        return OriginDestinationInformation?.OriginDestinationOptions?.[0]?.OriginDestinationOption?.map((OriginDestionationOption) => {
          return newKiuParser(OriginDestionationOption, RPH) as Offer;
        })
      })
      const combinedIteneries = combineKiuRoutes(itenaries, 60 * 6);
      const normalizedResponse = normalizeKiuResponse(combinedIteneries, "Economy")
      // normalizedResponse.forEach((response) => {
      //   const fareOptions: any = [];
      //   response.slices.forEach((slice) => {
      //     slice.segments.forEach(async (segment) => {
      //       segment.ResBookDesigCode.forEach(async (code) => {
      //         const price = await this.newSearchPrice({
      //           OriginDestinationOptions: [
      //             {
      //               FlightSegments: [
      //                 {
      //                   OriginLocation: segment.origin.iata_code,
      //                   DestinationLocation: segment.destination.iata_city_code,
      //                   DepartureDateTime: segment.departing_at,
      //                   ArrivalDateTime: segment.arriving_at,
      //                   MarketingAirline: segment.marketing_carrier.iata_code,
      //                   FlightNumber: segment.marketing_carrier_flight_number,
      //                   ResBookDesigCode: code,
      //                   CabinType: params.CabinClass,
      //                   RPH: RPH
      //                 }
      //               ]
      //             }
      //           ],
      //           Passengers: params.Passengers
      //         })
      //       })
      //     })
      //   })
      // })
      return normalizedResponse || [];
    } catch (error) {
      if (error?.response?.status === 509) {
        console.log("KIU's request limit exceeded");
        return [];
      }
      console.log(error);
      return [];
    }
  }

  async newSearchPrice(params: PriceRequestParams) {
    try {
      const requestXML = buildNewPriceRequest(params, this.mode)
      const response = await this.queuedPost(requestXML);
      // console.log("Price Response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      if (jsonResponse?.KIU_AirPriceRS?.Error) {
        console.log("Error in kiu pricing:");
        console.log(jsonResponse?.KIU_AirPriceRS?.Error);
      }
      return jsonResponse
    } catch (error) {
      throw error;
    }
  }

  async searchPrice(params: PriceRequestBuilderParams) {
    try {
      const requestXML = buildFlightPriceRequest(params, this.mode);
      // console.log("Price Request: ", requestXML);
      const response = await this.queuedPost(requestXML);
      // console.log("Price Response: ", response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      if (jsonResponse?.KIU_AirPriceRS?.Error) {
        console.log("Error in kiu pricing:");
        console.log(jsonResponse?.KIU_AirPriceRS?.Error);
      }
      return jsonResponse
    } catch (error) {
      throw error;
    }
  }

  async multiCitySearch({ routeSegments, departureDate, passengers }: multiCityFlightSearchParams): Promise<any> {
    try {
      const requestXML = bulidMultiCityFlightSearchRequest({ routeSegments, departureDate, passengers }, this.mode);
      const response = await this.queuedPost(requestXML);
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

  async bookFlight({ slice, passengers }: BookingRequestParams) {
    try {
      const request = buildBookingRequest({
        segments: slice.segments,
        passengers: passengers,
      }, this.mode);
      const response = await this.queuedPost(request);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      return jsonResponse;
    } catch (error) {
      throw error;
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