import { SubBookingStatus } from "@prisma/client"

export const kiuClasses = {
    economy: ['H', 'Y', 'T', 'K', 'N', 'V'],
    premium_economy: ['M'],
    business: ['J', 'C'],
    first: ['P', 'F']
}

export const GDS = {
    kiu: 'KIU',
    duffel: 'DUFFEL',
    amadeus: 'AMADEUS'
}

export const amadeusClass = {
    economy: 'ECONOMY',
    premium_economy: 'PREMIUM_ECONOMY',
    business: 'BUSINESS',
    first: 'FIRST'
}

export const flightTypeValue = {
    oneway: 'ONEWAY',
    roundtrip: 'ROUNDTRIP',
    multicity: 'MULTICITY'
}

export const SubBookingStatusValues: {
    pending: SubBookingStatus,
    confirmed: SubBookingStatus,
    cancelled: SubBookingStatus
} = {
    pending: "PENDING",
    confirmed: "CONFIRMED",
    cancelled: "CANCELLED"
}