import { create } from "xmlbuilder2";
import { BuildBookingRequestParams, FlightSearchParams, KiuJsonResponseType, KiuResponseType, NewKiuFlightSearchParams, OriginDestinationOptionsType, PriceRequestBuilderParams, PriceRequestParams } from "../../types/kiuTypes";
import { multiCityFlightSearchParams } from "../../types/amadeusTypes";
import moment from "moment";
import { GDS } from "../../constants/cabinClass";
import { Offer, Segment, Slice } from "../../types/flightTypes";
import { capitalizeFirstLetter, getDifferenceInMinutes, reorganizeFareCodes } from "./utils";
import HttpError from "./httperror";

export const getDateString = (date: string) => {
  const newDate = new Date(date);
  // console.log(newDate);
  const dateString = newDate.toISOString().slice(0, 10);
  return dateString;
}

export const buildBookingRequest = (params: BuildBookingRequestParams, target: 'Testing' | 'Production') => {
  try {
    const segments = params.segments.map((segment, index: number) => {
      return {
        "@DepartureDateTime": moment(segment.departing_at, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DDTHH:mm:ss"),
        "@ArrivalDateTime": moment(segment.arriving_at, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DDTHH:mm:ss"),
        "@FlightNumber": segment.operating_carrier_flight_number,
        "@ResBookDesigCode": segment.ResBookDesigCode,
        "@SegmentRPH": index + 1,
        DepartureAirport: {
          '@LocationCode': segment.origin.iata_code
        },
        ArrivalAirport: {
          '@LocationCode': segment.destination.iata_code
        },
        MarketingAirline: {
          '@Code': segment.operating_carrier.iata_code
        }
      }
    });

    const passengers = params.passengers.map((passenger, index) => {
      return {
        PersonName: {
          "@PTC": "ADT",
          NamePrefix: passenger.title.toUpperCase(),
          GivenName: passenger.firstName.toUpperCase(),
          Surname: passenger.lastName.toUpperCase(),
        },
        Document: {
          "@DocType": "PP",
          "@DocID": passenger.passportNumber
        },
        Telephone: {
          "@CountryAccessCode": passenger.phoneNumber.substring(1, passenger.phoneNumber.length - 10),
          "@AreaCityCode": "10",
          "@PhoneNumber": passenger.phoneNumber.slice(passenger.phoneNumber.length - 10)
        },
        Email: passenger.email,
        TravelerRefNumber: {
          "@RPH": index + 1
        }
      }
    })

    const currentTime = moment();
    const departingTime = moment(params.segments[0].departing_at, "YYYY-MM-DD HH:mm:ss");

    // Calculate the time 10 hours from now
    const timePlus10Hours = currentTime.clone().add(10, 'hours');

    // Calculate the latest permissible time (departure time minus 6 hours)
    const latestPermissibleTime = departingTime.clone().subtract(6, 'hours');

    // Determine the final time, ensuring it's no later than the latest permissible time
    const finalTime = moment.min(timePlus10Hours, latestPermissibleTime).format("YYYY-MM-DDTHH:mm:ss");


    const timestamp = moment.utc().format('YYYY-MM-DDTHH:mm:ss.S[Z]');
    const xmlObj = {
      KIU_AirBookV2RQ: {
        '@EchoToken': 'GERTESTWS3DOCS',
        '@Target': target,
        '@Version': '3.0',
        '@SequenceNmbr': '1',
        '@PrimaryLangID': 'en-us',
        '@TimeStamp': timestamp,
        "@xmlns:ns": "http://www.opentravel.org/OTA/2003/05/common",
        "@xmlns:vc": "http://www.w3.org/2007/XMLSchema-versioning",
        "@xmlns:sch": "http://purl.oclc.org/dsdl/schematron",
        "@xmlns:fn": "http://www.w3.org/2005/xpath-functions",
        "@xmlns": "http://www.opentravel.org/OTA/2003/05",
        "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "@xsi:schemaLocation": "http://www.opentravel.org/OTA/2003/05",
        POS: {
          Source: {
            '@AgentSine': process.env.AgentSine,
            '@TerminalID': process.env.TerminalID,
            '@ISOCountry': process.env.ISOCountry,
            '@ISOCurrency': process.env.ISOCurrency
          }
        },
        AirItinerary: {
          OriginDestinationOptions: {
            OriginDestinationOption: {
              FlightSegment: segments
            }
          }
        },
        TravelerInfo: {
          AirTraveler: passengers
        },
        Ticketing: {
          "@CancelOnExpiryInd": "true",
          "@TicketTimeLimit": finalTime,
          "@TimeLimitCity": "UTC"
        }
      }
    };
    const doc = create(xmlObj);
    const xml = doc.end({ prettyPrint: true });
    console.log("Booking Request: ");
    console.log(xml);
    return xml;

  } catch (error) {
    throw error;
  }
}

export const bulidMultiCityFlightSearchRequest = (params: multiCityFlightSearchParams, target: 'Testing' | 'Production') => {
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
      '@Target': target,
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

export const newbuildFlightSearchRequest = (params: NewKiuFlightSearchParams, target: 'Testing' | 'Production') => {
  const xmlObj = {
    KIU_AirAvailRQ: {
      '@EchoToken': '1',
      '@Target': target,
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
      OriginDestinationInformation: params.OriginDestinationOptions.map((OriginDestinationOption) => {
        return {
          DepartureDateTime: getDateString(OriginDestinationOption.DepartureDate),
          OriginLocation: {
            '@LocationCode': OriginDestinationOption.OriginLocation
          },
          DestinationLocation: {
            '@LocationCode': OriginDestinationOption.DestinationLocation
          }
        }
      }),
      TravelerInfoSummary: {
        AirTravelerAvail: {
          PassengerTypeQuantity: {
            '@Code': 'ADT',
            '@Quantity': params.Passengers.adults
          }
        }
      }
    }
  }
  const doc = create(xmlObj);
  const xml = doc.end({ prettyPrint: true });
  return xml;
}

export const combineKiuRoutes = (iteneries: Offer[][], minConnectionTime: number): Offer[][] => {
  try {
    let result: Offer[][] = iteneries[0].map(route => [route]);

    for (let i = 1; i < iteneries.length; i++) {
      const nextSegmentRoutes = iteneries[i];
      const newResult: (Offer)[][] = [];

      for (const currentRoute of result) {
        for (const nextRoute of nextSegmentRoutes) {
          if (nextRoute.total_amount === undefined) {
            console.log(nextRoute.total_amount);
          }
          // Ensure that the time difference is sufficient between current route and next route
          const lastSegmentOfCurrentRoute = currentRoute[currentRoute.length - 1]?.slices?.[0]?.segments;
          const lastSegmentLength = lastSegmentOfCurrentRoute?.length;
          const differenceInMinutes = getDifferenceInMinutes(
            lastSegmentOfCurrentRoute?.[lastSegmentLength - 1].arriving_at,
            nextRoute?.slices?.[0]?.segments?.[0]?.departing_at
          );

          // Check the time gap is more than the allowed transfer time

          if (differenceInMinutes > minConnectionTime) {
            // Sum the total_amount of the currentRoute and nextRoute
            // const totalAmount = currentRoute.reduce((sum, route) => sum + (parseFloat(route.total_amount) || 0), 0)
            //   + (parseFloat(nextRoute.total_amount) || 0);

            // Add the combined route with updated total_amount
            // newResult.push([...currentRoute, { ...nextRoute, total_amount: `${totalAmount}` }]);
            newResult.push([...currentRoute, nextRoute]);
          }

        }
      }

      result = newResult;
    }

    return result;
  } catch (error) {
    console.error(error);
    throw new HttpError("Error combining routes: " + error.message, 500);
  }
}

export const normalizeKiuResponse = (response: Offer[][], cabinClass: string) => {
  const result = response.map((offer) => {
    let slices: Slice[] = [];
    const fareOptions = [];
    let stops = 0;
    let responseId = "";
    let routeId = "";
    offer.forEach((route) => {
      slices.push(...(route.slices));
      responseId += route?.responseId
      routeId += route?.routeId
      if (route.fareBrands)
        fareOptions.push({
            fareBrands: route.fareBrands,
            origin: route.slices[0].origin,
            destination: route.slices[0].destination,
            departing_at: route.slices[0].departing_at,
            arriving_at: route.slices[0].arriving_at,
        });
    })
    slices.forEach((slice) => {
      stops += slice?.segments?.length - 1 || 0;
    })
    if (slices?.length > 1) {
      stops += 1
    }

    // const slicesWithBookingCode = slices.map((slice) => {
    //   let codesArray: string[][] = [];
    //   slice.segments.forEach((segment) => {
    //     codesArray.push(segment.ResBookDesigCode)
    //   })
    //   const reorganizedFareCodes = reorganizeFareCodes(codesArray);
    //   let minLength = reorganizedFareCodes[0].length;
    //   slice.segments.forEach((segment, index) => {
    //     segment.bookingAvl = reorganizedFareCodes[index];
    //     if (reorganizedFareCodes[index].length < minLength)
    //       minLength = reorganizedFareCodes[index].length
    //   })
    //   return {
    //     ...slice,
    //     minLength
    //   }
    // })

    return {
      origin: slices?.[0]?.origin,
      destination: slices?.[slices.length - 1]?.destination,
      departing_at: slices?.[0]?.departing_at,
      arriving_at: slices?.[slices.length - 1]?.arriving_at,
      responseId,
      routeId,
      stops,
      fareBrands: offer.map((data) => data.fareBrands),
      fareOptions:fareOptions,
      // duration: offer[0].duration,
      // base_currency: offer[0].base_currency,
      // tax_currency: offer[0].tax_currency,
      slices,
      cabinClass
    };
  })
  return result;
}

export const buildFlightSearchRequest = (params: FlightSearchParams, target: 'Testing' | 'Production') => {
  const xmlObj = {
    KIU_AirAvailRQ: {
      '@EchoToken': '1',
      '@Target': target,
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
      CabinPref: {
        '@Cabin': capitalizeFirstLetter(params.CabinClass.toLowerCase())
      },
      TravelerInfoSummary: {
        AirTravelerAvail: {
          PassengerTypeQuantity: {
            '@Code': 'ADT',
            '@Quantity': params.Passengers.adults
          }
        }
      }
    }
  }
  const doc = create(xmlObj);
  const xml = doc.end({ prettyPrint: true });
  return xml;
}

export const buildNewPriceRequest = (params: PriceRequestParams, target: 'Testing' | 'Production') => {
  const originDestinationOptions = params.OriginDestinationOptions.map((option) => {
    const flightSegments = option.FlightSegments.map((flightSegment) => {
      return {
        '@DepartureDateTime': flightSegment.DepartureDateTime,
        '@ArrivalDateTime': flightSegment.ArrivalDateTime,
        '@ResBookDesigCode': flightSegment.ResBookDesigCode, // Use param value or default
        '@FlightNumber': flightSegment.FlightNumber,
        DepartureAirport: {
          '@LocationCode': flightSegment.OriginLocation // Change OriginLocation to DepartureAirport
        },
        ArrivalAirport: {
          '@LocationCode': flightSegment.DestinationLocation // Change DestinationLocation to ArrivalAirport
        },
        MarketingAirline: {
          '@Code': flightSegment.MarketingAirline
        },
        MarketingCabin: { // Add MarketingCabin with CabinType and RPH
          '@CabinType': flightSegment.CabinType, // Default value, can be parameterized
          '@RPH': flightSegment.RPH
        }
      }
    });
    return {
      FlightSegment: flightSegments
    }
  })
  const xmlObj = {
    KIU_AirPriceRQ: {
      '@EchoToken': '1',
      '@Target': target,
      '@Version': '3.0',
      '@SequenceNmbr': '1',
      '@PrimaryLangID': 'en-us',
      '@TimeStamp': new Date().toISOString(),  // Add TimeStamp here
      '@IncludeBaggageAllowance': '1',
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
          OriginDestinationOption: originDestinationOptions
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
            {
              '@Code': 'INF',
              '@Quantity': params.Passengers.infants
            },
          ]
        }
      }
    }
  };

  const doc = create(xmlObj);
  const xml = doc.end({ prettyPrint: true });
  return xml;
}

export const findCommonCodes = (data: string[][]) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Convert first array to a Set
  let commonChars = new Set(data[0]);

  // Intersect with each subsequent array
  for (let i = 1; i < data.length; i++) {
    commonChars = new Set([...commonChars].filter(char => data[i].includes(char)));
  }

  // Convert back to an array
  return Array.from(commonChars);
}

export const buildFlightPriceRequest = (params: PriceRequestBuilderParams, target: 'Testing' | 'Production') => {
  // console.log("Marketing Airline: ", params.MarketingAirline);
  const xmlObj = {
    KIU_AirPriceRQ: {
      '@EchoToken': '1',
      '@Target': target,
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

// interface FlightSegment {
//   $: {
//     DepartureDateTime: string;
//     ArrivalDateTime: string;
//   };
// }

// interface OriginDestinationOption {
//   FlightSegment: FlightSegment[];
// }

// interface OriginDestinationInformation {
//   OriginDestinationOptions: OriginDestinationOption[];
// }

// interface KIU_AirAvailRS {
//   KIU_AirAvailRS: {
//     OriginDestinationInformation: OriginDestinationInformation[];
//   }
// }

// export function combineFlightsWithMinimumLayover(data: KIU_AirAvailRS) {
//   const results: OriginDestinationOption[][] = [];

//   function combineLegs(currentCombination: OriginDestinationOption[], legIndex: number) {
//     if (legIndex === data.KIU_AirAvailRS.OriginDestinationInformation.length) {
//       results.push([...currentCombination]);
//       return;
//     }

//     const currentLeg = data?.KIU_AirAvailRS?.OriginDestinationInformation[legIndex];

//     currentLeg?.OriginDestinationOptions?.forEach((option) => {
//       try {
//         if (currentCombination?.length > 0) {
//           const previousLegOption = currentCombination[currentCombination?.length - 1];
//           const lastFlightOfPreviousLeg = previousLegOption?.FlightSegment[previousLegOption?.FlightSegment?.length - 1];
//           const firstFlightOfCurrentLeg = option?.FlightSegment[0];

//           const arrivalTimePreviousLeg = new Date(lastFlightOfPreviousLeg?.$?.ArrivalDateTime)?.getTime();
//           const departureTimeCurrentLeg = new Date(firstFlightOfCurrentLeg?.$?.DepartureDateTime)?.getTime();

//           const timeDifferenceMinutes = (departureTimeCurrentLeg - arrivalTimePreviousLeg) / (1000 * 60);

//           if (timeDifferenceMinutes > 30) {
//             currentCombination?.push(option);
//             combineLegs(currentCombination, legIndex + 1);
//             currentCombination?.pop();
//           }
//         } else {
//           currentCombination?.push(option);
//           combineLegs(currentCombination, legIndex + 1);
//           currentCombination?.pop();
//         }
//       } catch (error) {
//         console.log(error);
//       }
//     });
//   }

//   combineLegs([], 0);

//   return results;
// }

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

export const newKiuParser = (data: OriginDestinationOptionsType, RPH: number) => {
  try {
    let responseId = "";
    let validSegment: boolean = true;
    const segments = data?.FlightSegment.map((segment, index): Segment => {
      responseId += segment?.MarketingAirline?.[0]?.$?.CompanyShortName + segment?.$?.FlightNumber;
      if(index > 0){
        validSegment = false;
      }
      return {
        origin: {
          iata_code: segment?.DepartureAirport?.[0]?.$?.LocationCode
        },
        destination: {
          iata_code: segment?.ArrivalAirport?.[0]?.$?.LocationCode,
        },
        departing_at: segment?.$?.DepartureDateTime,
        arriving_at: segment?.$?.ArrivalDateTime,
        marketing_carrier: {
          iata_code: segment?.MarketingAirline?.[0]?.$?.CompanyShortName
        },
        operating_carrier: {
          iata_code: segment?.MarketingAirline?.[0]?.$?.CompanyShortName
        },
        operating_carrier_flight_number: segment?.$?.FlightNumber,
        marketing_carrier_flight_number: segment?.$?.FlightNumber,
        duration: segment?.$?.JourneyDuration,
        passengers: [],
        ResBookDesigCode: segment.BookingClassAvail.filter((data) => (parseInt(data.$.RPH) === RPH && parseInt(data.$.ResBookDesigQuantity) > 0)).map((data) => data.$.ResBookDesigCode),
      }
    });
    //@ts-ignore
    if(validSegment === false){
      return false;
    }
    return {
      slices: [
        {
          origin: segments[0]?.origin,
          destination: segments[segments.length - 1]?.destination,
          departing_at: segments[0]?.departing_at,
          arriving_at: segments[segments.length - 1]?.arriving_at,
          segments,
          sourceId: GDS.kiu
        }
      ],
      responseId,
      sourceId: GDS.kiu,
    }
  } catch (error) {
    console.error(error);
    return {}
  }
}

// export const combineKiuRoutes = (data: )

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

        responseId += `${route?.MarketingAirline[0]?.$?.CompanyShortName}${route?.$?.FlightNumber.lenght === 4 ? route?.$?.FlightNumber : '0'.repeat(4 - route?.$?.FlightNumber.length) + route?.$?.FlightNumber}`
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
        origin: segments?.[0]?.origin,
        destination: segments?.[segments.length - 1]?.destination,
        departing_at: segments?.[0]?.departing_at,
        arriving_at: segments?.[segments.length - 1]?.arriving_at,
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