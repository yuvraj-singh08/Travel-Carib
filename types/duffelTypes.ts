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