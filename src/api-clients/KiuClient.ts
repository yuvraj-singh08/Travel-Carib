import axios, { AxiosInstance } from 'axios';
import { getDateString } from '../utils/kiu';
import { create } from 'xmlbuilder2';
import xml2js from 'xml2js';
import { FlightSearchParams } from '../../types/kiuTypes';

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
      }
    })

    this.searchFlights = this.searchFlights.bind(this);
  }

  async searchFlights(params: FlightSearchParams): Promise<any> {
    try {
      const DepartureDate = getDateString(params.DepartureDate)
      const xmlObj = {
        KIU_AirAvailRQ: {
          '@EchoToken': '1',
          '@Target': 'Production',
          '@Version': '3.0',
          '@SequenceNmbr': '1',
          '@PrimaryLangID': 'en-us',
          '@DirectFlightsOnly': 'false',
          '@MaxResponses': '10',
          '@CombinedItineraries': 'false',
          POS: {
            Source: {
              '@AgentSine': 'PTYS3653X',
              '@TerminalID': 'PTYS36504R',
              '@ISOCountry': 'PA'
            }
          },
          OriginDestinationInformation: {
            DepartureDateTime: DepartureDate,
            OriginLocation: {
              '@LocationCode': params.OriginLocation
            },
            DestinationLocation: {
              '@LocationCode': params.DestinationLocation
            }
          },
          TravelPreferences: {
            '@MaxStopsQuantity': '4'
          },
          TravelerInfoSummary: {
            AirTravelerAvail: {
              PassengerTypeQuantity: {
                '@Code': 'ADT',
                '@Quantity': params.Passengers
              }
            }
          }
        }
      }
      const doc = create(xmlObj);
      const xml = doc.end({ prettyPrint: true });
      const response = await this.axiosInstance.post('', {
        user: "MYDESTINYPANAMA",
        password: "!%XQJ7MB3969J*Qn",
        request: xml
      })
      const parser = new xml2js.Parser();
      const parsedResponse = await parser.parseStringPromise(response.data);
      return parsedResponse;
    } catch (error) {
      throw new Error('Error fetching flights from KIU: ' + (error as Error).message);
    }
  }
}

export default KiuClient;
