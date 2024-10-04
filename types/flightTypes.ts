import { CabinClass } from "@duffel/api/types"

export type FlightOfferSearchParams = {
    originLocation: string,
    destinationLocation: string,
    departureDate: string,
    passengerType: string,
    maxLayovers: number,
    cabinClass: CabinClass,
    filters?: FilterType
}

export type routeType = {
    origin: string,
    destination: string
}

export type Offer = {
    total_emissions_kg: string;
    payment_requirements: {
        price_guarantee_expires_at: string | null;
        payment_required_by: string | null;
        requires_instant_payment: boolean;
    };
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
};

type Slice = {
    comparison_key: string;
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
    id: string;
};

type Segment = {
    origin_terminal: string;
    destination_terminal: string | null;
    aircraft: string | null;
    departing_at: string;
    arriving_at: string;
    operating_carrier: Carrier;
    marketing_carrier: Carrier;
    operating_carrier_flight_number: string;
    marketing_carrier_flight_number: string;
    stops: any[];
    distance: string | null;
    passengers: SegmentPassenger[];
    media: any[];
    duration: string;
    destination: Location;
    origin: Location;
    id: string;
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

type Location = {
    iata_city_code: string;
    city_name: string | null;
    icao_code: string | null;
    iata_country_code: string;
    iata_code: string;
    latitude: number | null;
    longitude: number | null;
    city: City | null;
    time_zone: string | null;
    type: string;
    name: string;
    id: string;
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
    logo_symbol_url: string;
    logo_lockup_url: string;
    conditions_of_carriage_url: string;
    iata_code: string;
    name: string;
    id: string;
};

export type FilterType = {
    MaxPrice?: number,
    MinPrice?: number,
    MaxDuration?: number,
    MaxStops?: number
}