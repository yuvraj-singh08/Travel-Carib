import { CreateOrderPassenger, CreateOrderService } from "@duffel/api/types"

type DuffelOfferRequest = {
    slices: [
        {
            origin: string
            destination: string
            departure_date: string
        }
    ],
    passengers: string
    cabin_class: string
    return_offers: string
    max_connections: string
}

export type DuffelCreateOrderParams = {
    offerId: string;
    holdOrder?: boolean;
    passengers: CreateOrderPassenger[]
    services: CreateOrderService[]
    totalAmount: string;
}