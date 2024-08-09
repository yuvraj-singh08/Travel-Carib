import Amadus from 'amadeus'
import { routeType } from './flightTypes'

export type FlightOfferSearchParams = {
    departure: string,
    arrival: string,
    locationDeparture: string,
    locationArrival: string,
    adults: string,
}

export type multiCityFlightSearchParams = {
    routeSegments: routeType[],
    departureDate: string,
    passengers: number
}

export type amadeusClientType = InstanceType<typeof Amadus>