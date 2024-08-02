import { create } from "xmlbuilder2";
import { FlightSearchParams } from "../../types/kiuTypes";

export const getDateString = (date: string) => {
    const newDate = new Date(date);
    console.log(newDate);
    const dateString = newDate.toISOString().slice(0, 10);
    return dateString;
}

export const buildFlightSearchRequest = (params: FlightSearchParams) => {
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
              '@AgentSine': process.env.AgentSine,
              '@TerminalID': process.env.TerminalID,
              '@ISOCountry': process.env.ISOCountry
            }
          },
          OriginDestinationInformation: {
            DepartureDateTime: params.DepartureDate,
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
      return xml;
}

export const buildFlightPriceRequest = (params: FlightSearchParams) => {
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
            '@AgentSine': process.env.AgentSine,
            '@TerminalID': process.env.TerminalID,
            '@ISOCountry': process.env.ISOCountry
          }
        },
        OriginDestinationInformation: {
          DepartureDateTime: params.DepartureDate,
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
    return xml;
}

export const parseFlightSearchResponse = (jsonResponse: any) => {
    const segments = jsonResponse?.KIU_AirAvailRS?.OriginDestinationInformation[0]?.OriginDestinationOptions[0]?.OriginDestinationOption;
    if(segments === undefined) {
        return [];
    }
    const flights = segments?.map((segment, index) => {
        const flightSegment = segment?.FlightSegment;
        const stopsDetails = flightSegment?.map((data, index) => {
            const bookingClassAvailable = data?.BookingClassAvail?.map((bookingClass, index) => {
                return {
                    resBookDesignCode: bookingClass?.$?.ResBookDesigCode,
                    resBookDesignQuantity: bookingClass?.$?.ResBookDesigQuantity
                }
            })
            return {
                from: data.DepartureAirport[0]?.$?.LocationCode,
                to: data.ArrivalAirport[0]?.$?.LocationCode,
                ailinecode: data.MarketingAirline[0]?.$?.CompanyShortName,
                flightNumber: data?.$?.FlightNumber,
                departureDateTime: data?.$?.DepartureDateTime,
                arrivalDateTime: data?.$?.ArrivalDateTime,
                journeyDuration: data?.$?.JourneyDuration,
                bookingClassAvailable,
            }   
        })
        console.log(stopsDetails);
        return {stopsDetails}
    })
    return flights;
}