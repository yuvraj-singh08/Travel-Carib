import axios, { AxiosInstance } from 'axios';
import { buildFlightSearchRequest, bulidMultiCityFlightSearchRequest, combineFlightsWithMinimumLayover, getDateString, parseFlightSearchResponse } from '../utils/kiu';
import xml2js from 'xml2js';
import { FlightSearchParams } from '../../types/kiuTypes';
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
      const requestXML =  buildFlightSearchRequest({...params, DepartureDate: DepartureDate});
      const response = await this.axiosInstance.post('', {
        user: process.env.KIU_USER,
        password: process.env.KIU_PASSWORD,
        request: requestXML
      })
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      const parsedResponse = await parseFlightSearchResponse(jsonResponse);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async multiCitySearch({routeSegments, departureDate, passengers}: multiCityFlightSearchParams): Promise<any>{
    try {
      const requestXML = bulidMultiCityFlightSearchRequest({routeSegments, departureDate, passengers})
      const response = await this.axiosInstance.post('', {
        user: process.env.KIU_USER,
        password: process.env.KIU_PASSWORD,
        request: requestXML
      })
      console.log(response.data);
      const parser = new xml2js.Parser();
      const jsonResponse = await parser.parseStringPromise(response.data);
      const parsedResponse = combineFlightsWithMinimumLayover(jsonResponse);
      // const parsedResponse = await parseFlightSearchResponse(jsonResponse);
      return parsedResponse
    } catch (error) {
      throw error
    }
  }
}

export type KiuClientInstance = InstanceType<typeof KiuClient>
export default KiuClient;