import { FareBrandType, Location } from "./flightTypes";

export interface RouteOptionParams {
    origin: string;
    destination: string;
}

export type RouteOptionResponse = {
    possibleRoutes: RouteOptionParams[][];
    searchManagement: any
}

export interface SearchManagementSchema {
    id?: string
    ruleTitle?: string
    gdsNdcSupplier?: string
    ruleType?: string
    journeyType?: string
    fromOriginAirport?: string
    toDestinationsAirport?: string
    connectingAirports?: any
    airlinesIncluded?: string[]
    airlinesExcluded?: string[]
    flightExcluded?: string
    minConnectionTime?: string
    maxConnectionTime?: string
    status?: string
    noteDescription?: string
    priority?: number
    fareCodesExcluded?: string
    lastUpdate?: Date
}

export interface ManualLayoverSearchParams {
    origin: string;
    destination: string;
    passengers: {
        adults: number;
        children: number;
        infants: number;
    },
    cabinClass: 'first' | 'business' | 'economy' | 'premium_economy';
    departureDate: string;

}

export interface FareOption {
    origin: Location,
    destination: Location,
    departing_at: string;
    arriving_at: string;
    fareBrands: FareBrandType[]
}

export interface CommomBaggageType {
    quantity?: string;
    weight?: string;
    unit?: string;
}

export interface KiuPassengerBaggageData {
    cabinBaggage?: CommomBaggageType;
    checkedBaggage?: CommomBaggageType;
    handBaggage?: CommomBaggageType;
}

export interface KiuBaggageData {
    adultBaggage?: KiuPassengerBaggageData;
    childBaggage?: KiuPassengerBaggageData;
    infantBaggage?: KiuPassengerBaggageData;
}

export interface getCustomFarePrice {
    fareOptionGDS: "KIU" | "DUFFEL" | "AMADEUS",
    offerId: string,
    choices: string[];
    passengers: {
        adults: number,
        children: number,
        infants: number
    }
}