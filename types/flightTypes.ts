import { CabinClass } from "@duffel/api/types"

export type FlightOfferSearchParams = {
    originLocation: string,
    destinationLocation: string,
    departureDate: string,
    passengerType: string,
    maxLayovers: number,
    cabinClass: CabinClass,
}

export type routeType = {
    origin: string,
    destination: string
}