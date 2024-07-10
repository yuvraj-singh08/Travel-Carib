import axiosInstance from "./axios";
import xml2js from "xml2js";


export const getAvailableFlights = async (data) => {
    const {
        from,
        to,
        cabinPref,
        passengerQuantity,
        dateString
    } = data;
    const response = await axiosInstance.post('', {
        user: process.env.USERID,
        password: process.env.PASSWORD,
        request: `<?xml version="1.0" encoding="UTF-8"?>
<KIU_AirAvailRQ EchoToken="1" Target="Production" Version="3.0" SequenceNmbr="1" PrimaryLangID="en-us" DirectFlightsOnly="false" MaxResponses="10" CombinedItineraries="false">
    <POS>
        <Source AgentSine="PTYS3653X" TerminalID="PTYS36504R" ISOCountry="PA" />
    </POS>
    <OriginDestinationInformation>
        <DepartureDateTime>${dateString}</DepartureDateTime>
        <OriginLocation LocationCode="${from}" />
        <DestinationLocation LocationCode="${to}" />
    </OriginDestinationInformation>
        <TravelPreferences MaxStopsQuantity="4">
        
    </TravelPreferences>
    <TravelerInfoSummary>
        <AirTravelerAvail>
            <PassengerTypeQuantity Code="ADT" Quantity="${passengerQuantity}" />
        </AirTravelerAvail>
    </TravelerInfoSummary>
</KIU_AirAvailRQ>`
    })
    const parser = new xml2js.Parser();
    const parsedResponse = await parser.parseStringPromise(response.data);
    return parsedResponse;
}

export const getFlightPrice = async (data) => {

    let requestData = "";

    data.map((data) => {
        let flightSegments = "";
        data.map((data) => {
            flightSegments += `<FlightSegment DepartureDateTime="${data.departureDateTime}" ArrivalDateTime="${data.arrivalDateTime}" StopQuantity="0" FlightNumber="${data.flightNumber}" ResBookDesigCode="${data.bookingClassAvailable[0].resBookDesignCode}" JourneyDuration="${data.journeyDuration}"><DepartureAirport LocationCode="${data.from}"/><ArrivalAirport LocationCode="${data.to}"/><MarketingAirline Code="${data.ailinecode}"/></FlightSegment>`;
        })
        requestData += `<OriginDestinationOptions><OriginDestinationOption>${flightSegments}</OriginDestinationOption></OriginDestinationOptions>`;
    })
    const request = `<?xml version="1.0" encoding="UTF-8"?><KIU_AirPriceRQ EchoToken="WS3DOCEXAMPLE" TimeStamp="2024-06-28T15:27:52+00:00" Target="Production" Version="3.0" SequenceNmbr="1" PrimaryLangID="en-us"><POS><Source AgentSine="PTYS3653X" TerminalID="PTYS36504R" ISOCountry="PA" ISOCurrency="USD"><RequestorID Type="5" /><BookingChannel Type="1" /></Source></POS><AirItinerary>${requestData}</AirItinerary><TravelerInfoSummary><PriceRequestInformation><TPA_Extension><TourCode Type="N" /></TPA_Extension></PriceRequestInformation><AirTravelerAvail><PassengerTypeQuantity Code="ADT" Quantity="1" /></AirTravelerAvail></TravelerInfoSummary></KIU_AirPriceRQ>`
    console.log("Request: ");
    console.log(request);
    const response = await axiosInstance.post('', {
        user: process.env.USERID,
        password: process.env.PASSWORD,
        request,
    })
    console.log("Response data: ", response.data)
    // return response.data;
    const parser = new xml2js.Parser();
    const parsedResponse = await parser.parseStringPromise(response.data);
    return parsedResponse;
}

export const getData = (segments) => {
    const flights = segments.map((segment, index) => {
        const flightSegment = segment.FlightSegment;
        const stopsDetails = flightSegment.map((data, index) => {
            const bookingClassAvailable = data.BookingClassAvail.map((bookingClass, index) => {
                return {
                    resBookDesignCode: bookingClass.$.ResBookDesigCode,
                    resBookDesignQuantity: bookingClass.$.ResBookDesigQuantity
                }
            })
            return {
                from: data.DepartureAirport[0].$.LocationCode,
                to: data.ArrivalAirport[0].$.LocationCode,
                ailinecode: data.MarketingAirline[0].$.CompanyShortName,
                flightNumber: data.$.FlightNumber,
                departureDateTime: data.$.DepartureDateTime,
                arrivalDateTime: data.$.ArrivalDateTime,
                journeyDuration: data.$.JourneyDuration,
                bookingClassAvailable,
            }
        })
        console.log(stopsDetails);
        return {stopsDetails}
    })
    return flights;
}

export const getPriceData = (dataSegments) => {
    
}