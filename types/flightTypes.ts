import { CabinClass, DuffelPassengerGender, DuffelPassengerTitle, DuffelPassengerType } from "@duffel/api/types"
import { $Enums } from "@prisma/client"
import { KiuBaggageData } from "./types"

export type FlightOfferSearchParams = {
    originLocation: string,
    destinationLocation: string,
    departureDate: string,
    passengerType: string,
    maxLayovers: number,
    cabinClass: CabinClass,
    passengers: {
        adults: number,
        children: number,
        infants: number
    },
    returnDate?: string,
    sortBy: 'BEST' | 'FAST' | 'CHEAP',
    filters?: FilterType
}

export type FlightLeg = {
    originLocation: string,
    destinationLocation: string,
    departureDate: string,
}

export type MultiCitySearchParams = {
    FlightDetails: FlightLeg[],
    passengerType: string,
    sortBy: 'BEST' | 'FAST' | 'CHEAP',
    maxLayovers: number,
    passengers: {
        adults: number,
        children: number,
        infants: number
    },
    cabinClass: CabinClass,
    filters?: FilterType
    flightWay?: "ONEWAY" | "ROUNDTRIP" | "MULTICITY"
}

export type NewMultiCitySearchParams = {
    FlightDetails: FlightLeg[],
    sortBy: 'BEST' | 'FAST' | 'CHEAP',
    maxLayovers: number,
    passengers: {
        adults: number,
        children: number,
        infants: number
    },
    cabinClass: 'first' | 'business' | 'economy' | 'premium_economy';
    filters?: FilterType
}

export type routeType = {
    origin: string,
    destination: string
}

export type MulticityOffer = {
    total_amount: number;
    itenaries: Offer[]
    cabinClass: string;
    id: string;
}

export type Offer = {
    total_emissions_kg: string;
    payment_requirements: {
        price_guarantee_expires_at: string | null;
        payment_required_by: string | null;
        requires_instant_payment: boolean;
    };
    commissionAmount: number;
    stops: number;
    available_services: string | null;
    supported_passenger_identity_document_types: string[];
    passenger_identity_documents_required: boolean;
    tax_currency: string;
    base_currency: string;
    base_amount: string;
    supported_loyalty_programmes: any[];
    private_fares: any[];
    tax_amount: string;
    total_currency: string;
    created_at: string;
    live_mode: boolean;
    total_amount: string;
    slices: Slice[];
    passengers: Passenger[];
    departing_at: string,
    arriving_at: string,
    conditions: {
        refund_before_departure: string | null;
        change_before_departure: string | null;
    };
    updated_at: string;
    expires_at: string;
    partial: boolean;
    owner: Carrier;
    id: string;
    responseId: string;
    cabinBaggage: number;
    fareBrands: FareBrandType[];
    checkedBaggage: number;
    sourceId: string;
    routeId: string;
    fareOptions: any;
};

export type FareBrandType = {
    baggageData?: KiuBaggageData;
    fareBrand: string;
    totalAmount: number;
    cabinBaggage?: number;
    checkedBaggage?: number;
    offerId: string;
}

export interface AggregatedFareBrand {
    fareBrand: string;
    totalAmount: number;
    cabinBaggage?: number;
    checkedBaggage?: number;
    offerIds: string[];
}

export type Slice = {
    comparison_key: string;
    departing_at?: string;
    arriving_at?: string;
    ngs_shelf: number;
    destination_type: string;
    origin_type: string;
    fare_brand_name: string;
    segments: Segment[];
    conditions: {
        priority_check_in: string | null;
        priority_boarding: string | null;
        advance_seat_selection: string | null;
        change_before_departure: string | null;
    };
    duration: string;
    destination: Location;
    origin: Location;
    gdsOfferId?: string;
    sourceId: string;
    passengers: {
        type: string;
        id: string;
    }[],
    sliceAmount: string;
    selfTransfer?: boolean;
    travelerPricings?: any,
};

export type Segment = {
    origin_terminal?: string;
    destination_terminal?: string | null;
    aircraft?: string | null;
    departing_at?: string;
    arriving_at?: string;
    operating_carrier?: Carrier;
    marketing_carrier?: Carrier;
    operating_carrier_flight_number?: string;
    marketing_carrier_flight_number?: string;
    stops?: any[];
    distance?: string | null;
    passengers?: SegmentPassenger[];
    media?: any[];
    duration?: string;
    destination?: Location;
    origin?: Location;
    id?: string;
    checkedBaggage?: number;
    cabinBaggage?: number;
    bookingAvl?: string[],
    ResBookDesigCode?: string[];
    segmentPrice?: any;
    selfTransferSegment?: boolean;
};

type SegmentPassenger = {
    cabin: {
        amenities: any | null;
        marketing_name: string;
        name: string;
    };
    baggages: Baggage[];
    cabin_class_marketing_name: string;
    passenger_id: string;
    fare_basis_code: string;
    cabin_class: string;
};

type Baggage = {
    quantity: number;
    type: string;
};

export type OfferPassengerType = {
    id: string;
    type: string;
    offerId: string;
    gds_passenger_id: string[];
    baggageDetails: GdsBaggageType[];
}

export type GdsBaggageType = {
    maximum_quantity: number;
    passenger_ids: string[];
    total_currency: string;
    total_amount: string;
    metadata: {
        maximum_weight_kg: number;
        type: "checked";
    },
    type: string;
    id: string;
}

export type UtilBaggageType = Omit<DbBaggageType, 'serviceIds' | 'prices'> & {
    serviceId: string;
}

export type DbBaggageType = {
    weightInKg: number;
    type: string;
    maxQuantity: number;
    price: number;
    currency: string;
    serviceIds: string[];
    prices: number[];
}


export type Location = {
    iata_city_code?: string;
    city_name?: string | null;
    icao_code?: string | null;
    iata_country_code?: string;
    iata_code?: string;
    latitude?: number | null;
    longitude?: number | null;
    city?: City | null;
    time_zone?: string | null;
    type?: string;
    name?: string;
    id?: string;
};

type City = {
    iata_city_code: string;
    city_name: string | null;
    icao_code: string | null;
    iata_country_code: string;
    iata_code: string;
    latitude: number | null;
    longitude: number | null;
    time_zone: string | null;
    type: string;
    name: string;
    id: string;
};

type Passenger = {
    fare_type: string | null;
    loyalty_programme_accounts: any[];
    family_name: string | null;
    given_name: string | null;
    age: string | null;
    type: string;
    id: string;
};

type Carrier = {
    logo_symbol_url?: string;
    logo_lockup_url?: string;
    conditions_of_carriage_url?: string;
    iata_code?: string;
    name?: string;
    id?: string;
};

export type FilterType = {
    MaxPrice?: number,
    MinPrice?: number,
    MaxDuration?: number,
    MaxStops?: number,
    MaxOnwardDuration?: number,
    MinOnwardDuration?: number,
    MaxDepartureTime?: number, //In hours
    MinDepartureTime?: number,
    MaxArrivalTime?: number,
    MinArrivalTime?: number,
    CabinBaggage?: number,
    CheckedBaggage?: number,
    SelfTransferAllowed?: boolean,
    PrefferedAirlines?: string[],
}

export type Firewall = {
    title: string,
    supplier: string,
    code: string,
    flightNumber: string,
    from: string,
    to: string,
    flightSequence?: string,
}

export interface FlightDate {
    type: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: {
        total: string;
    };
    links: {
        flightDestinations: string;
        flightOffers: string;
    };
}

export interface PriceCalendar {
    date: string;
    minPrice: number;
}

export type CommissionType = {
    id: string;
    supplier: $Enums.FlightSupplier;
    updateTime: Date;
    type: string;
    commissionTitle: string;
    commissionFees: string;
    feeType: $Enums.AirlineFeeType;
}

export interface AirlineProvider {
    id: string;
    label: string;
    src?: string;
    iata_code?: string;
}

export interface PassengerType {
    id: string;
    title: DuffelPassengerTitle
    firstName: string;
    lastName: string;
    gender: DuffelPassengerGender;
    nationality: string;
    passportNumber: string;
    passportExpiryDate: string;
    issuingCountry: string;
    type: DuffelPassengerType;
    infant_passenger_id?: string;
    email: string;
    phoneNumber: string;
    baggageDetails?: CreateOrderPassengerBaggageDetails[];
    dob: string;
}

export interface CreateOrderPassengerBaggageDetails {
    weightInKg: number;
    quantity: number;
    price: number;
    serviceIds: string[];
    prices: number[];
}

export type DuffelPassengerResponseType = {
    type: DuffelPassengerType,
    id: string;
}
export interface ContactDetailsType {
    phone: string;
    email: string;
}

export type SubBookingType = {
    pnr: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    ticket?: string;
    supplier: string;
}

export type CreateBookingServiceParams = {
    flightData: any;
    passengers: PassengerType[];
    flightType: "ONEWAY" | "ROUNDTRIP" | "MULTICITY";
    userId: string;
    contactDetails: ContactDetailsType;
    subBookings: SubBookingType[]
}

export type SetPassengerIdServiceParams = {
    duffelPassengers?: DuffelPassengerResponseType[],
    amadeusPassengers?: DuffelPassengerResponseType[],
    kiuPassengers?: DuffelPassengerResponseType[],
    offerPassengers: {
        id: string,
        type: "ADULT" | "CHILD" | "INFANT"
    }[]
}

export type UpdateSubBookingType = {
    id: string;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    ticket?: string;
}