import { flightsRoutes } from "../../constants/flightRoutes";
import { FlightOfferSearchParams } from "../../types/flightTypes";
import { amadeusGetRoute, getRoute  } from "../utils/flights";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";

class FlightClient {
    private duffelClient: DuffelClientInstance
    private amadeusClient : AmadeusClientInstance

    constructor() {
        this.duffelClient = new DuffelClient();
        this.amadeusClient= new AmadeusClient();
        this.getSegment1 = this.getSegment1.bind(this);
        this.getSegment2 = this.getSegment2.bind(this);
        this.flightOfferSearch = this.flightOfferSearch.bind(this);
    }
    
    async flightOfferSearch(params: FlightOfferSearchParams) {
        try {
            const flights = flightsRoutes.filter((flight): boolean | void => {
                if (flight.from === params.originLocation && flight.to === params.destinationLocation)
                    return true;
            })
            if(!(flights.length>0)){
                const offer = await this.duffelClient.createOfferRequest({
                    slices: [
                        {
                            origin: params.originLocation,
                            destination: params.destinationLocation,
                            departure_date: params.departureDate,
                            // Optionally include return and layovers if needed
                            // return: new Date(),
                            // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                        }
                    ],
                    passengers: [{ type: "adult" }],
                    cabin_class: "economy",
                    max_connections: 2
                })
                const directResults = await this.duffelClient.getOfferRequestById(offer.data.id)
                return directResults
            }
            // const ret = await this.getSegment1(flights[0].from, flights[0].layovers)
            // return ret
            const [segment1, segment2, offer] = await Promise.all([
                this.getSegment1(flights[0].from, flights[0].layovers),
                this.getSegment2(flights[0].to, flights[0].layovers),
                this.duffelClient.createOfferRequest({
                    slices: [
                        {
                            origin: params.originLocation,
                            destination: params.destinationLocation,
                            departure_date: params.departureDate,
                            // Optionally include return and layovers if needed
                            // return: new Date(),
                            // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                        }
                    ],
                    passengers: [{ type: "adult" }],
                    cabin_class: "economy",
                    max_connections: 2
                })
            ])
            console.log("Before calling getRoute of flightOfferSearch", (new Date()))
            const response = []
            for (let i = 0; i < segment1.length; i++) {
                const pairs = getRoute(segment1[i], segment2[i])
                response.push(...pairs)
            }
            const directResults = await this.duffelClient.getOfferRequestById(offer.data.id)
            console.log("Before Returning", (new Date()))
            return [directResults,...response]
        } catch (error) {
            throw error;
        }
    }

    async amadeusOfferSearch(params: FlightOfferSearchParams){
        try {
            const  flights = flightsRoutes.filter((flight): boolean | void =>{
               if (flight.from === params.originLocation && flight.to === params.destinationLocation)
                    return true;

            })
            const[segment1 , segment2]= await Promise.all([
                this.amadeusGetSegment1(flights[0].from ,flights[0].layovers),
                this.amadeusGetSegment2(flights[0].to, flights[0].layovers)
            ])
            const response=[]
             for (let i = 0; i < segment1.length; i++) {
                const pairs = amadeusGetRoute(segment1[i], segment2[i])
                response.push(...pairs)
            }
            return response;
            
        } catch (error) {
            throw error;
            
        }
    }

    async getSegment1(from: string, layovers: string[]) {
        try {
            console.log("Start of getSegment1", (new Date()))
            const firstHalf = layovers.map((layover) => {
                // Assuming you have a duffelClient instance already set up
                console.log("Time in mapping segment1 createOffer", (new Date()))
                return this.duffelClient.createOfferRequest({
                    slices: [
                        {
                            origin: from,
                            destination: layover,
                            departure_date: "2024-08-14",
                            // Optionally include return and layovers if needed
                            // return: new Date(),
                            // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                        }
                    ],
                    passengers: [{ type: "adult" }],
                    cabin_class: "economy",
                    max_connections: 2
                });
            });

            const offerRequests = await Promise.all(firstHalf);
            console.log("Before Getting getOfferRequest of getSegment1", (new Date()))
            const dataRequest = offerRequests.map((response) => {
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const response = await Promise.all(dataRequest);
            console.log("End of getSegment1", (new Date()))
            return response;
        } catch (error) {
            throw error
        }
    }
    
    async amadeusGetSegment1(from : string , layover:string[] ){
        try {
            const firstHalf = layover.map((layover)=>{
                return this.amadeusClient.searchFlights({
                    locationDeparture : from,
                    locationArrival : layover,
                    departure:"2024-08-14",
                    arrival:'2024-08-16',
                    adults:"2"



                });
            });
            const offerRequests = await Promise.all(firstHalf);
            return offerRequests;
          
        
            
            
        } catch (error) {
            throw error
            
        }
    }


    async getSegment2(to: string, layovers: string[]) {
        try {
            console.log("Start of getSegment2", (new Date()))
            const secondHalf = layovers.map((layover) => {
                // Assuming you have a this.duffelClient instance already set up
                console.log("Time in mapping segment2 createOffer", (new Date()))
                return this.duffelClient.createOfferRequest({
                    slices: [
                        {
                            origin: layover,
                            destination: to,
                            departure_date: "2024-08-14",
                            // Optionally include return and layovers if needed
                            // return: new Date(),
                            // layovers: flights.find(f => f.from === from && f.to === to).layovers.map(l => ({ code: l, duration: 120 }))
                        }
                    ],
                    passengers: [{ type: "adult" }],
                    cabin_class: "economy",
                    max_connections: 2
                });
            });

            const offerRequests = await Promise.all(secondHalf);
            const dataRequest = offerRequests.map((response) => {
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const response = await Promise.all(dataRequest);
            console.log("End of getSegment2", (new Date()))
            return response;
        } catch (error) {
            throw error
        }
    }
    
    async amadeusGetSegment2 (to:string , layover:string[]){
     try {
         const secondHalf = layover.map((layover)=>{
            return this.amadeusClient.searchFlights({
                    locationDeparture : layover,
                    locationArrival : to,
                    departure:"2024-08-14", //flight can also reach on next date to layover 
                    arrival:'2024-08-16',
                    adults:"2"



                });
            });
            const offerRequests = await Promise.all(secondHalf);
            return offerRequests;
         
     } catch (error) {
         throw error
     }
    }
}




export type FlightClientInstance = InstanceType<typeof FlightClient>
export default FlightClient;