import Amadus from 'amadeus'
import { routeType } from './flightTypes'
import { CabinClass } from '@duffel/api/types'

export type FlightOfferSearchParams = {
    departure: string,
    locationDeparture: string,
    locationArrival: string,
    adults: string,
    passengers: any,
    cabinClass: CabinClass
}

export type OriginDestination = {
    id: number,
    originLocationCode: string,
    destinationLocationCode: string,
    departureDateTimeRange: {
        date: string,
    }
}

export type AmadeusNewSearchParams = {
    passengers: any;
    originDestinations: OriginDestination[];
    cabinClass: string;
}

export type multiCityFlightSearchParams = {
    routeSegments: routeType[],
    departureDate: string,
    passengers: number,
    index?: number
}

export type AmadeusResponseType = {
    data: AmadeusOfferType[],
    dictionaries: Dictionaries,
}

export type Dictionaries = {
    locations: {
        [key: string]: {
            cityCode: string;
            countryCode: string;
        };
    };
    aircraft: {
        [key: string]: string;
    };
    currencies: {
        [key: string]: string;
    };
    carriers: {
        [key: string]: string;
    };
};


export type AmadeusOfferType = {
    type: "flight-offer";
    id: string;
    source: string;
    instantTicketingRequired: boolean;
    nonHomogeneous: boolean;
    oneWay: boolean;
    isUpsellOffer: boolean;
    lastTicketingDate: string;
    lastTicketingDateTime: string;
    numberOfBookableSeats: number;
    itineraries: Itinerary[];
    price: Price;
    pricingOptions: PricingOptions;
    validatingAirlineCodes: string[];
    travelerPricings: TravelerPricing[];
    gdsOfferId: string
};

type Itinerary = {
    duration: string;
    segments: Segment[];
};

type Segment = {
    departure: LocationDetails;
    arrival: LocationDetails;
    carrierCode: string;
    number: string;
    aircraft: Aircraft;
    operating: Operating;
    duration: string;
    id: string;
    numberOfStops: number;
    blacklistedInEU: boolean;
};

type LocationDetails = {
    airport: any
    iataCode: string;
    at: string;
};

type Aircraft = {
    code: string;
};

type Operating = {
    carrierCode: string;
};

type Price = {
    currency: string;
    total: string;
    base: string;
    fees: Fee[];
    grandTotal: string;
};

type Fee = {
    amount: string;
    type: string;
};

type PricingOptions = {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
};

type TravelerPricing = {
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: TravelerPrice;
    fareDetailsBySegment: FareDetailsBySegment[];
};

type TravelerPrice = {
    currency: string;
    total: string;
    base: string;
};

type FareDetailsBySegment = {
    segmentId: string;
    cabin: string;
    fareBasis: string;
    brandedFare: string;
    brandedFareLabel: string;
    class: string;
    includedCheckedBags: CheckedBags;
    amenities: Amenity[];
};

type CheckedBags = {
    quantity: number;
};

type Amenity = {
    description: string;
    isChargeable: boolean;
    amenityType: string;
    amenityProvider: AmenityProvider;
};

type AmenityProvider = {
    name: string;
};


export type amadeusClientType = InstanceType<typeof Amadus>