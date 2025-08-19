import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { buildBookingRequest, buildFlightPriceRequest, buildFlightSearchRequest, buildNewPriceRequest, bulidMultiCityFlightSearchRequest, combineKiuRoutes, findCommonCodes, getDateString, newbuildFlightSearchRequest, newKiuParser, normalizeKiuResponse, parseFlightSearchResponse, parseKiuResposne } from '../utils/kiu';
import xml2js from 'xml2js';
import { BookingRequestParams, FlightSearchParams, KiuJsonResponseType, NewKiuFlightSearchParams, PriceFlightSegment, PriceOriginDestinationOption, PriceRequestBuilderParams, PriceRequestParams } from '../../types/kiuTypes';
import { multiCityFlightSearchParams } from '../../types/amadeusTypes';
import { kiuClasses } from '../../constants/cabinClass';
import { AirlineProvider, CommissionType, FareBrandType, Offer, Slice } from '../../types/flightTypes';
import { getGdsCreds } from '../services/GdsCreds.service';
import { capitalizeFirstLetter, getAirlineLogo, getAirlineNameByCode } from '../utils/utils';
import HttpError from '../utils/httperror';
import { KiuBaggageData } from '../../types/types';
import { prisma } from '../prismaClient';

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
        throw new Error("KIU credentials not found in DB");
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

      setTimeout(() => {
        processNextRequest();
      }, this.queueInterval);
      this.axiosInstance.post('', payload)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
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

  async searchFlights(params: NewKiuFlightSearchParams): Promise<any> {
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
        const data: Offer[] = [];
        OriginDestinationInformation?.OriginDestinationOptions?.[0]?.OriginDestinationOption?.forEach((OriginDestionationOption) => {
          const parsedValue = newKiuParser(OriginDestionationOption, RPH) as Offer | false;
          if (parsedValue === false) {
            return;
          }
          data.push(parsedValue);
        })
        return data;
      })
      console.log(itenaries)
      await Promise.allSettled(itenaries.map(async (itinerary) => {
        const offerPromises = await Promise.allSettled(itinerary.map(async (offer) => {
          const fareBrands: FareBrandType[] = [];
          const fareCodePromises = await Promise.allSettled(offer.slices[0].segments[0].ResBookDesigCode.map(async (code) => {
            const priceResponse = await this.newSearchPrice({
              OriginDestinationOptions: [
                {
                  FlightSegments: offer.slices[0].segments.map((segment) => {
                    return {
                      OriginLocation: segment.origin.iata_code,
                      DestinationLocation: segment.destination.iata_code,
                      DepartureDateTime: segment.departing_at,
                      ArrivalDateTime: segment.arriving_at,
                      CabinType: 'economy',
                      FlightNumber: segment.marketing_carrier_flight_number,
                      MarketingAirline: segment.marketing_carrier.iata_code,
                      ResBookDesigCode: code,
                      RPH: RPH
                    }
                  })
                }
              ],
              Passengers: params.Passengers
            });
            if (priceResponse.error === false) {
              fareBrands.push({
                baggageData: priceResponse.baggageData,
                fareBrand: code,
                offerId: "fewf",
                totalAmount: priceResponse.totalPrice
              })
            }

          }))
          fareBrands.sort((a, b) => a.totalAmount - b.totalAmount);
          console.log("Sorted Fare brands", fareBrands);
          offer.fareBrands = fareBrands;
          offer.total_amount = fareBrands[0].totalAmount;
        }))
      }))

      return itenaries;
    } catch (error) {
      if (error?.response?.status === 509) {
        console.log("KIU's request limit exceeded");
        return [];
      }
      console.log(error);
      return [];
    }
  }

  async newSearchFlights(params: NewKiuFlightSearchParams): Promise<any> {
    try {

      console.log("-----------------------------------")

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
        const data: Offer[] = [];
        OriginDestinationInformation?.OriginDestinationOptions?.[0]?.OriginDestinationOption?.forEach((OriginDestionationOption) => {
          const parsedValue = newKiuParser(OriginDestionationOption, RPH) as Offer | false;
          if (parsedValue === false) {
            return;
          }
          data.push(parsedValue);
        })
        return data;
      })
      console.log(itenaries)

      const airlineSet = new Set<string>();
      const extendedDataMap = new Map<string, AirlineProvider>();
      
      await Promise.allSettled(itenaries.map(async (itinerary) => {
        const offerPromises = await Promise.allSettled(itinerary.map(async (offer) => {
          const fareBrands: FareBrandType[] = [];
          const fareCodePromises = await Promise.allSettled(offer.slices[0].segments[0].ResBookDesigCode.map(async (code) => {
            const priceResponse = await this.newSearchPrice({
              OriginDestinationOptions: [
                {
                  FlightSegments: offer.slices[0].segments.map((segment) => {
                    // Add airline to set and extended data map
                    const iata_code = segment.marketing_carrier.iata_code;
                    airlineSet.add(iata_code);
                    extendedDataMap.set(iata_code, {
                      id: iata_code,
                      label: segment.marketing_carrier.name ?? getAirlineNameByCode(iata_code) ?? iata_code ?? "",
                      src: segment.marketing_carrier.logo_symbol_url || getAirlineLogo(iata_code),
                      iata_code
                    });

                    return {
                      OriginLocation: segment.origin.iata_code,
                      DestinationLocation: segment.destination.iata_code,
                      DepartureDateTime: segment.departing_at,
                      ArrivalDateTime: segment.arriving_at,
                      CabinType: 'economy',
                      FlightNumber: segment.marketing_carrier_flight_number,
                      MarketingAirline: segment.marketing_carrier.iata_code,
                      ResBookDesigCode: code,
                      RPH: RPH
                    }
                  })
                }
              ],
              Passengers: params.Passengers
            });
            if (priceResponse.error === false) {
              fareBrands.push({
                baggageData: priceResponse.baggageData,
                fareBrand: code,
                offerId: "fewf",
                totalAmount: priceResponse.totalPrice
              })
            }

          }))
          fareBrands.sort((a, b) => a.totalAmount - b.totalAmount);
          console.log("Sorted Fare brands", fareBrands);
          offer.fareBrands = fareBrands;
          offer.total_amount = fareBrands[0].totalAmount;
        }))
      }))

      const combinedIteneries = combineKiuRoutes(itenaries, 60 * 6);
      const normalizedResponse = normalizeKiuResponse(combinedIteneries, "Economy") as unknown as Offer[] | any[];
      await Promise.all(normalizedResponse.map(async (offer, index) => {
        const originDestinationOptions: PriceOriginDestinationOption[] = offer.slices.map((slice, sliceIndex): PriceOriginDestinationOption => {
          const FlightSegments = slice.segments.map((segment): PriceFlightSegment => {
            const flightSegment: PriceFlightSegment = {
              OriginLocation: segment.origin.iata_code,
              DestinationLocation: segment.destination.iata_code,
              DepartureDateTime: segment.departing_at,
              ArrivalDateTime: segment.arriving_at,
              CabinType: params.CabinClass,
              FlightNumber: segment.marketing_carrier_flight_number,
              MarketingAirline: segment.marketing_carrier.iata_code,
              ResBookDesigCode: offer.fareOptions[sliceIndex].fareBrands?.[0]?.fareBrand,
              RPH: RPH
            }
            return flightSegment;
          });
          return {
            FlightSegments: FlightSegments
          }
        });
        const priceResponse = await this.newSearchPrice({
          OriginDestinationOptions: originDestinationOptions,
          Passengers: params.Passengers,
        })
        console.log("Price Response: ", priceResponse);
        if (priceResponse.error === true) {
          const codesArray: string[][] = [];
          offer.slices.forEach((slice) => {
            const codes = slice.segments[0].ResBookDesigCode; //Taking from first segment because there will always be one segment.
            codesArray.push(codes)
          });
          const commonCodes = findCommonCodes(codesArray);
          let priced = false;
          if (commonCodes.length > 0) {
            for (const code of commonCodes) {
              originDestinationOptions.forEach((option) => {
                option.FlightSegments.forEach((segment) => {
                  segment.ResBookDesigCode = code
                })
              });
              const priceResponse = await this.newSearchPrice({
                OriginDestinationOptions: originDestinationOptions,
                Passengers: params.Passengers,
              })
              console.log("Price Response: ", priceResponse);
              if (priceResponse.error === false) {
                normalizedResponse[index].invalidResponse = false;
                normalizedResponse[index].total_amount = (priceResponse.totalPrice);
                priced = true
                break;
              }
            }
          }
          if (priced === false)
            normalizedResponse[index].invalidResponse = true;
        }
        else {
          normalizedResponse[index].invalidResponse = false;
          normalizedResponse[index].total_amount = (priceResponse.totalPrice);
        }
        return priceResponse;
      }))

      return {response: normalizedResponse.filter((offer: any) => !offer.invalidResponse) || [], airlines: Array.from(airlineSet), extendedData: Array.from(extendedDataMap.values())};
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
      const requestXML = buildNewPriceRequest(params, this.mode);
      const [response, commission] = await Promise.all([
        this.queuedPost(requestXML),
        prisma.commissionManagement.findMany({
          where:{
            supplier: {
              in: ["KIUSYS", "ALL"]
            },
            type: "AIRLINE"
          }
        })
      ]);

      console.log("kiw------------------------response",commission)

      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);

      if (jsonResponse?.KIU_AirPriceRS?.Error) {
        console.error("Price Request XML:", requestXML);
        console.error("Error in KIU Pricing:", jsonResponse.KIU_AirPriceRS.Error);
        return { error: true, message: "KIU Pricing Error", details: jsonResponse.KIU_AirPriceRS.Error };
      }

      const pricedItineraries = jsonResponse?.KIU_AirPriceRS?.PricedItineraries?.[0]?.PricedItinerary?.[0];
      if (!pricedItineraries) {
        return { error: true, message: "No pricing data available" };
      }

      const totalPrice = pricedItineraries?.AirItineraryPricingInfo?.[0]?.ItinTotalFare?.[0]?.TotalFare?.[0]?.$?.Amount || '0';
      const fareBreakdown = pricedItineraries?.AirItineraryPricingInfo?.[0]?.PTC_FareBreakdowns?.[0]?.PTC_FareBreakdown || [];

      const baggageData: KiuBaggageData = {
        adultBaggage: { checkedBaggage: {}, cabinBaggage: {}, handBaggage: {} },
        childBaggage: { checkedBaggage: {}, cabinBaggage: {}, handBaggage: {} },
        infantBaggage: { checkedBaggage: {}, cabinBaggage: {}, handBaggage: {} },
      };

      fareBreakdown.forEach((fareData) => {
        const passengerCode = fareData.PassengerTypeQuantity?.[0]?.$?.Code;
        const baggageDetails = fareData.BaggageAllowance?.[0] || {};

        const checkedBaggage = {
          quantity: baggageDetails?.ChequedBaggage?.[0]?.Pieces?.[0] || '0',
          weight: baggageDetails?.ChequedBaggage?.[0]?.Weight?.[0] || '0',
          unit: baggageDetails?.ChequedBaggage?.[0]?.Unit?.[0] === "K" ? "Kg" : baggageDetails?.ChequedBaggage?.[0]?.Unit?.[0] || "Kg",
        };

        const cabinBaggage = {
          quantity: baggageDetails?.CabinBaggage?.[0]?.Pieces?.[0] || '0',
          weight: baggageDetails?.CabinBaggage?.[0]?.Weight?.[0] || '0',
          unit: baggageDetails?.CabinBaggage?.[0]?.Unit?.[0] === "K" ? "Kg" : baggageDetails?.CabinBaggage?.[0]?.Unit?.[0] || "Kg",
        };

        const handBaggage = { quantity: baggageDetails?.HandBaggage ? '1' : '0' };

        if (passengerCode === "ADT") baggageData.adultBaggage = { checkedBaggage, cabinBaggage, handBaggage };
        if (passengerCode === "CNN") baggageData.childBaggage = { checkedBaggage, cabinBaggage, handBaggage };
        if (passengerCode === "INF") baggageData.infantBaggage = { checkedBaggage, cabinBaggage, handBaggage };
      });
      let commissionAmount = 0;
      commission.forEach((commission) => {
        if (commission.feeType === 'FIXED') {
          commissionAmount += parseFloat(commission.commissionFees);
        }
        else {
          commissionAmount += (parseFloat(totalPrice) * parseFloat(commission.commissionFees)) / 100.00;
        }
      })
      return { totalPrice: parseFloat(totalPrice) + commissionAmount, baggageData, error: false };

    } catch (error) {
      console.error("Error in pricing:", error);
      return { error: true, message: "Internal Server Error", details: error };
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

  async bookFlight({ slices, choices, kiuPassengers, passengers }: BookingRequestParams) {
    try {
      const request = buildBookingRequest({
        slices,
        passengers: passengers,
        choices,
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