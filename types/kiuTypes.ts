import { PassengerType, Segment, Slice } from "./flightTypes";

export type FlightSearchParams = {
    OriginLocation: string,
    DestinationLocation: string,
    DepartureDate: string,
    ReturnDate?: string,
    CabinClass: string,
    Passengers: {
        adults: number,
        children: number,
        infants: number
    },
    tripOrigin: string;
    tripDestination: string;
}

export type OriginDestinationOption = {
    OriginLocation: string,
    DestinationLocation: string,
    DepartureDate: string,
}

export type NewKiuFlightSearchParams = {
    OriginDestinationOptions: OriginDestinationOption[],
    ReturnDate?: string,
    CabinClass: string,
    Passengers: {
        adults: number,
        children: number,
        infants: number
    },
    // tripOrigin: string;
    // tripDestination: string;
}

export type PriceRequestBuilderParams = {
    OriginLocation: string,
    DestinationLocation: string,
    DepartureDateTime: string,
    ArrivalDateTime: string,
    MarketingAirline: string,
    FlightNumber: string,
    ReturnDate?: string,
    Passengers: {
        adults: number,
        children: number,
        infants: number
    },
    ResBookDesigCode: string
}

export type bookingClassType = {
    $: {
        ResBookDesigCode: string,
        ResBookDesigQuantity: number,
        RPH: number
    }
}

export type flightSegmentType = {
    $: {
        DepartureDateTime: string;
        ArrivalDateTime: string;
        StopQuantity: string;
        FlightNumber: string;
        JourneyDuration: string;
    };
    DepartureAirport: Array<{
        $: { LocationCode: string };
    }>;
    ArrivalAirport: Array<{
        $: { LocationCode: string };
    }>;
    Equipment: Array<{
        $: { AirEquipType: string | number }; // Number if parsed, but usually a string in XML
    }>;
    MarketingAirline: Array<{
        $: { CompanyShortName: string };
    }>;
    Meal: Array<{
        $: { MealCode: string };
    }>;
    MarketingCabin: Array<{
        $: { CabinType: string; RPH: string | number };
    }>;
    BookingClassAvail: bookingClassType[];
};

export type OriginDestinationOptionsType = {
    FlightSegment: flightSegmentType[]
}

export type KiuResponseType = {
    $: {
        EchoToken: string,
        TimeStamp: string,
        Target: string,
        Version: string,
        SequenceNmbr: string,
    },
    Success: [

    ],
    OriginDestinationInformation: [
        {
            DepartureDateTime: string[],
            OriginLocation: string[],
            DestinationLocation: string[],
            OriginDestinationOptions: { OriginDestinationOption: OriginDestinationOptionsType[] }[]
        }
    ]
}

export type OriginDestinationInformation = {
    DepartureDateTime: string[],
    OriginLocation: string[],
    DestinationLocation: string[],
    OriginDestinationOptions: { OriginDestinationOption: OriginDestinationOptionsType[] }[]
}

export type KiuJsonResponseType = {
    $: {
        EchoToken: string,
        TimeStamp: string,
        Target: string,
        Version: string,
        SequenceNmbr: string,
    };
    Success: string[];
    OriginDestinationInformation: OriginDestinationInformation[];
}

export type BuildBookingRequestParams = {
    segments: Segment[],
    passengers: PassengerType[]
}

export type BookingRequestParams = {
    slice: Slice,
    passengers: PassengerType[],

}