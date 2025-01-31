import { create } from "xmlbuilder2";
import { FlightSearchParams, KiuResponseType, PriceRequestBuilderParams } from "../../types/kiuTypes";
import { multiCityFlightSearchParams } from "../../types/amadeusTypes";
import moment from "moment";
import { GDS } from "../../constants/cabinClass";

export const getDateString = (date: string) => {
  const newDate = new Date(date);
  // console.log(newDate);
  const dateString = newDate.toISOString().slice(0, 10);
  return dateString;
}

export const bulidMultiCityFlightSearchRequest = (params: multiCityFlightSearchParams) => {
  const segments = params.routeSegments.map((segment) => {
    return {
      DepartureDateTime: params.departureDate,
      OriginLocation: {
        '@LocationCode': segment.origin
      },
      DestinationLocation: {
        '@LocationCode': segment.destination
      }
    }
  })

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
      OriginDestinationInformation: segments,
      TravelPreferences: {
        '@MaxStopsQuantity': '4',
        CabinPref: {
          '@Cabin': 'Economy'
        }
      },
      TravelerInfoSummary: {
        AirTravelerAvail: {
          PassengerTypeQuantity: {
            '@Code': 'ADT',
            '@Quantity': '1'
          }
        }
      }
    }
  };

  const doc = create(xmlObj);
  const xml = doc.end({ prettyPrint: true });
  // console.log(xml)
  return xml;
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

export const buildFlightPriceRequest = (params: PriceRequestBuilderParams) => {
  // console.log("Marketing Airline: ", params.MarketingAirline);
  const xmlObj = {
    KIU_AirPriceRQ: {
      '@EchoToken': '1',
      '@Target': 'Production',
      '@Version': '3.0',
      '@SequenceNmbr': '1',
      '@PrimaryLangID': 'en-us',
      '@TimeStamp': new Date().toISOString(),  // Add TimeStamp here
      POS: {
        Source: {
          '@AgentSine': process.env.AgentSine,
          '@TerminalID': process.env.TerminalID,
          '@ISOCountry': process.env.ISOCountry,
          '@ISOCurrency': process.env.ISOCurrency,
          RequestorID: {
            '@Type': '5' // Add RequestorID
          },
          BookingChannel: {
            '@Type': '1' // Add BookingChannel
          }
        }
      },
      AirItinerary: {
        OriginDestinationOptions: {
          OriginDestinationOption: {
            FlightSegment: {
              '@DepartureDateTime': params.DepartureDateTime,
              '@ArrivalDateTime': params.ArrivalDateTime,
              '@ResBookDesigCode': params.ResBookDesigCode || 'Y', // Use param value or default
              '@FlightNumber': params.FlightNumber,
              DepartureAirport: {
                '@LocationCode': params.OriginLocation // Change OriginLocation to DepartureAirport
              },
              ArrivalAirport: {
                '@LocationCode': params.DestinationLocation // Change DestinationLocation to ArrivalAirport
              },
              MarketingAirline: {
                '@Code': params.MarketingAirline
              },
              MarketingCabin: { // Add MarketingCabin with CabinType and RPH
                '@CabinType': 'Economy', // Default value, can be parameterized
                '@RPH': '1'
              }
            }
          }
        }
      },
      TravelerInfoSummary: {
        AirTravelerAvail: {
          PassengerTypeQuantity: [//  (ADT: Adult, CNN: Minor, INF: Infant)
            {
              '@Code': 'CNN',
              '@Quantity': params.Passengers.children
            },
            {
              '@Code': 'ADT',
              '@Quantity': params.Passengers.adults
            },
          ]
        }
      }
    }
  };

  const doc = create(xmlObj);
  const xml = doc.end({ prettyPrint: true });
  return xml;
};


// export const parseMultiFlightResponse = (jsonResponse: KiuResponseType) => {
//   const segments = jsonResponse?.OriginDestinationInformation.map((route) => {
//     const options = route.OriginDestinationOptions.map()
//   })
// }

export const parseFlightSearchResponse = (jsonResponse: any) => {
  const segments = jsonResponse?.KIU_AirAvailRS?.OriginDestinationInformation[0]?.OriginDestinationOptions[0]?.OriginDestinationOption;
  if (segments === undefined) {
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
    // console.log(stopsDetails);
    return { stopsDetails }
  })
  return flights;
}

interface FlightSegment {
  $: {
    DepartureDateTime: string;
    ArrivalDateTime: string;
  };
}

interface OriginDestinationOption {
  FlightSegment: FlightSegment[];
}

interface OriginDestinationInformation {
  OriginDestinationOptions: OriginDestinationOption[];
}

interface KIU_AirAvailRS {
  KIU_AirAvailRS: {
    OriginDestinationInformation: OriginDestinationInformation[];
  }
}

export function combineFlightsWithMinimumLayover(data: KIU_AirAvailRS) {
  const results: OriginDestinationOption[][] = [];

  function combineLegs(currentCombination: OriginDestinationOption[], legIndex: number) {
    if (legIndex === data.KIU_AirAvailRS.OriginDestinationInformation.length) {
      results.push([...currentCombination]);
      return;
    }

    const currentLeg = data?.KIU_AirAvailRS?.OriginDestinationInformation[legIndex];

    currentLeg?.OriginDestinationOptions?.forEach((option) => {
      try {
        if (currentCombination?.length > 0) {
          const previousLegOption = currentCombination[currentCombination?.length - 1];
          const lastFlightOfPreviousLeg = previousLegOption?.FlightSegment[previousLegOption?.FlightSegment?.length - 1];
          const firstFlightOfCurrentLeg = option?.FlightSegment[0];

          const arrivalTimePreviousLeg = new Date(lastFlightOfPreviousLeg?.$?.ArrivalDateTime)?.getTime();
          const departureTimeCurrentLeg = new Date(firstFlightOfCurrentLeg?.$?.DepartureDateTime)?.getTime();

          const timeDifferenceMinutes = (departureTimeCurrentLeg - arrivalTimePreviousLeg) / (1000 * 60);

          if (timeDifferenceMinutes > 30) {
            currentCombination?.push(option);
            combineLegs(currentCombination, legIndex + 1);
            currentCombination?.pop();
          }
        } else {
          currentCombination?.push(option);
          combineLegs(currentCombination, legIndex + 1);
          currentCombination?.pop();
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  combineLegs([], 0);

  return results;
}

export const combineRoute = (route1: any, route2: any) => {
  try {
    const SELF_TRANSFER_TIME_DIFF: number = parseInt(process.env.SELF_TRANSFER_TIME_DIFF);
    const response = [];
    if (route1 === undefined || route2 === undefined) {
      return [];
    }
    route1.forEach((route1) => {
      route2.forEach((route2) => {
        const route1Arrival = new Date(route1?.FlightSegment[0]?.$?.ArrivalDateTime);
        const route2Departure = new Date(route2?.FlightSegment[route2?.FlightSegment?.length - 1]?.$?.DepartureDateTime);
        const timeDifferenceInHours = (route2Departure.getTime() - route1Arrival.getTime()) / (1000 * 60 * 60);
        if (timeDifferenceInHours > SELF_TRANSFER_TIME_DIFF) {
          response.push({
            FlightSegment: [
              ...route1.FlightSegment,
              { selfTransfer: true },
              ...route2.FlightSegment
            ]
          })
        }
      })
    })
    return response
  } catch (error) {
    throw error;
  }
}

export const parseKiuResposne = (data: any, kiuFirewall: any = [], origin: string, destination: string) => {
  try {
    if (data?.Root?.Error !== undefined) {
      console.log("Error in KIU response: ", data.Root.Error);
      return []
    }
    const n = data?.KIU_AirAvailRS?.OriginDestinationInformation?.length;
    const options = data?.KIU_AirAvailRS?.OriginDestinationInformation;
    const getParsedOptions = (data: any) => {
      return data?.OriginDestinationOptions?.[0]?.OriginDestinationOption;
    }

    let combinedRoute;
    if (options?.length === 1)
      combinedRoute = getParsedOptions(options?.[0])
    else {
      combinedRoute = combineRoute(getParsedOptions(options?.[0]), getParsedOptions(options?.[1]));
      for (let i = 2; i < n; i++) {
        combinedRoute = combineRoute(combinedRoute, getParsedOptions(options[i]));
      }
    }

    let slices = [], segments = [], response = [], responseId = "", routeId = "";

    combinedRoute?.forEach((option) => {

      let flag = true;
      option?.FlightSegment?.forEach((route) => {

        if (route?.selfTransfer === true) {
          slices.push({
            segments
          })
          segments = [];
          return;
        }

        responseId += `${route?.MarketingAirline[0]?.$?.CompanyShortName}${route?.$?.FlightNumber}`
        routeId += route?.DepartureAirport?.[0]?.$?.LocationCode + route?.ArrivalAirport?.[0]?.$?.LocationCode + ','

        // Convert date strings to Moment.js objects
        const departureTime = moment(route?.$?.DepartureDateTime, 'YYYY-MM-DDTHH:mm:ss'); // Adjust the format based on your actual date string format
        const arrivalTime = moment(route?.$?.ArrivalDateTime, 'YYYY-MM-DDTHH:mm:ss'); // Adjust the format based on your actual date string format

        const bookingAvl = route?.BookingClassAvail?.map((data) => {
          return {
            code: data?.$?.ResBookDesigCode,
            quantity: data?.$?.ResBookDesigQuantity
          }
        })
        const segment = {
          departing_at: route?.$?.DepartureDateTime,
          arriving_at: route?.$?.ArrivalDateTime,
          duration: moment.duration(arrivalTime.diff(departureTime)),
          operating_carrier: {
            iata_code: route?.MarketingAirline?.[0]?.$?.CompanyShortName
          },
          operating_carrier_flight_number: route?.$?.FlightNumber,
          origin: {
            iata_code: route?.DepartureAirport?.[0]?.$?.LocationCode
          },
          destination: {
            iata_code: route?.ArrivalAirport?.[0]?.$?.LocationCode
          },
          bookingAvl,
          cabinBaggage: 1,
          checkedBaggage: 1,
        };

        segments.push(segment);

        for (let i = 0; i < kiuFirewall.length; i++) {
          if (kiuFirewall[i].from === origin && kiuFirewall[i].to === destination) {
            if (segment?.operating_carrier?.iata_code === kiuFirewall[i]?.code) {
              if (!kiuFirewall[i].flightNumber) {
                flag = false;
                break;
              }
              else if (kiuFirewall[i].flightNumber === (segment?.operating_carrier_flight_number)) {
                flag = false;
                break;
              }
            }
          }
          else if (!kiuFirewall[i]?.from && segment?.operating_carrier?.iata_code === kiuFirewall[i]?.code) {
            if (!kiuFirewall[i].flightNumber) {
              flag = false;
              break;
            }
            else if (kiuFirewall[i].flightNumber === (segment?.operating_carrier_flight_number)) {
              flag = false;
              break;
            }
          }
        }

      });

      slices.push({
        segments,
        sourceId: GDS.kiu
      })
      segments = [];
      const sliceLength = slices.length;
      const segmentLength = slices?.[sliceLength - 1]?.segments?.length;

      const arrivalTime = moment(slices?.[sliceLength - 1]?.segments?.[segmentLength - 1].arriving_at, 'YYYY-MM-DDTHH:mm:ss'); // Adjust the format based on your actual date string format
      const departureTime = moment(slices?.[0]?.segments?.[0].departing_at, 'YYYY-MM-DDTHH:mm:ss'); // Adjust the format based on your actual date string format

      if (flag)
        response.push({
          responseId,
          routeId,
          sourceId: GDS.kiu,
          slices,
          base_currency: "USD",
          tax_currency: "USD",
          duration: moment.duration(arrivalTime.diff(departureTime)),
          origin: slices?.[0]?.segments?.[0]?.origin,
          destination: slices[sliceLength - 1]?.segments?.[segmentLength - 1]?.destination,
          departing_at: slices?.[0]?.segments?.[0]?.departing_at,
          arriving_at: slices[sliceLength - 1]?.segments?.[segmentLength - 1]?.arriving_at
        });
      slices = [];
      responseId = "";
      routeId = "";
    })

    return response
  } catch (error) {
    console.log(error);
    return [];
  }
}