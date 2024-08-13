import { create } from "xmlbuilder2";
import { FlightSearchParams, KiuResponseType } from "../../types/kiuTypes";
import { multiCityFlightSearchParams } from "../../types/amadeusTypes";

export const getDateString = (date: string) => {
  const newDate = new Date(date);
  console.log(newDate);
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
  console.log(xml)
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
    console.log(stopsDetails);
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
