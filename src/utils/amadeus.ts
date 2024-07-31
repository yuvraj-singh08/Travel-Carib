export const parseFlightOfferSearchResponse = (jsonResponse: any) => {
    const parsedResponse = jsonResponse?.map((data, index) => {
        const parsedData = data?.itineraries[0]?.segments?.map((segment, index) => {
            return {
                from: segment?.departure?.iataCode,
                to: segment?.arrival?.iataCode,
                airlineCode: segment?.operating?.carrierCode,
                flightNumber: segment?.aircraft?.code,
                departureDateTime: segment?.departure?.at,
                arrivalDateTime: segment?.arrival?.at,
                journeyDuration: segment?.duration
            }
        })
        return { 
            stopDetails: parsedData,
            price: data?.price
         }
    })
    return parsedResponse;
}