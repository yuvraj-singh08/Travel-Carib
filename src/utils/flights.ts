import { DuffelResponse, OfferRequest } from "@duffel/api/types";


export const getRoute = (segment1: DuffelResponse<OfferRequest>, segment2: DuffelResponse<OfferRequest>) => {
    const pairs = [];
    segment1?.data?.offers?.forEach(segment1Offer => {
        // const departureTime = offer?.slices[0]?.segments[0]?.departing_at;
        console.log("Start of getRoute", (new Date()))

        const n = segment1Offer?.slices[0]?.segments?.length;
        const arrivalTime = segment1Offer?.slices[0]?.segments[n - 1]?.arriving_at;
        segment2?.data?.offers?.forEach(segment2Offer => {
            const departureTime = segment2Offer?.slices[0]?.segments[0]?.departing_at;
            const dateArrival = new Date(arrivalTime);
            const dateDeparture = new Date(departureTime);
            //@ts-ignore
            const diffInMs = dateArrival - dateDeparture;
            const diffInHours = diffInMs / 3600000;
            if(diffInHours > 2){
                pairs?.push({
                    from: segment1Offer?.slices[0]?.origin,
                    to: segment2Offer?.slices[0]?.destination,
                    layovers: segment1Offer?.slices[0]?.destination,
                    departureTime,
                    arrivalTime,
                    duration: diffInHours ,
                    segments: {
                        segment1: segment1Offer?.slices[0]?.segments,  
                        segment2: segment2Offer?.slices[0]?.segments
                    }
            });
            }
        });
    });
        console.log("End of getRoute", (new Date()))
        return pairs;

   
}

export const amadeusGetRoute = (segment1 : any , segment2 :any )=>{
    const pairs=[];
    segment1?.forEach(segment1Offer=>{
         console.log("Start of getRoute", (new Date()))
         const n = segment1Offer?.itineraries[0]?.segments?.length;
         const arrivalTime = segment1Offer?.itineraries[0]?.segments[n-1]?.arrival;
    segment2?.forEach(segment2Offer=>{
        const departureTime = segment2Offer?.itineraries?.segments[0]?.departure;
        const dateArrival = new Date(arrivalTime);
        const dateDeparture = new Date(departureTime);
         //@ts-ignore
           const diffInMs = dateArrival - dateDeparture;
            const diffInHours = diffInMs / 3600000;
             if(diffInHours > 2){
                pairs?.push({
                   from: segment1Offer?.itineraries[0]?.segments[0]?.departure,
                   to : segment2Offer?.itineraries[0]?.segments[n-1]?.arrival,
                    departureTime,
                    arrivalTime,
                    duration: diffInHours,
                    segments:{
                        segment1:segment1Offer?.itineraries,
                        segment2:segment2Offer?.itineraries
                    }
            });
            }

    })

    })
    return pairs;
}