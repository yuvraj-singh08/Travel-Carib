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
        DepartureDateTime: string,
        ArrivalDateTime: string,
        StopQuantity: string,
        FlightNumber: string,
        JourneyDuration: string,
    },
    DepartureAirport: [
        {
            $: {
                LocationCode: string
            }
        }
    ],
    ArrivalAirport: [
        {
            $: {
                LocationCode: string
            }
        }
    ],
    Equipment: [
        {
            $: {
                AirEquipType: number
            }
        }
    ],
    MarketingAirline: [
        {
            $: {
                CompanyShortName: string
            }
        }
    ],
    Meal: [
        {
            $: {
                MealCode: string
            }
        }
    ],
    MarketingCabin: [
        {
            $: {
                CabinType: string,
                RPH: number
            }
        }
    ],
    BookingClassAvail: bookingClassType[]
}

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
            OriginDestinationOptions: OriginDestinationOptionsType[]
        }
    ]
}