import { flightsRoutes } from "../../constants/flightRoutes";
import { FlightOfferSearchParams } from "../../types/flightTypes";
import { amadeusGetRoute, getRoute, parseAmadeusResponse, parseDuffelResponse } from "../utils/flights";
import AmadeusClient, { AmadeusClientInstance } from "./AmadeusClient";
import DuffelClient, { DuffelClientInstance } from "./DuffelClient";

class FlightClient {
    private duffelClient: DuffelClientInstance
    private amadeusClient: AmadeusClientInstance

    constructor() {
        this.duffelClient = new DuffelClient();
        this.amadeusClient = new AmadeusClient();
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
            if (!(flights.length > 0)) {
                const [offer1, offer2] = await Promise.all([
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
                    }),
                    this.amadeusClient.searchFlights({
                        departure: params.departureDate,
                        arrival: "1238",
                        locationDeparture: params.originLocation,
                        locationArrival: params.destinationLocation,
                        adults: "1",
                    })
                ])
                const directResults = await this.duffelClient.getOfferRequestById(offer1.data.id)
                const duffelResponse = parseDuffelResponse(directResults);
                const amadeusResponse = parseAmadeusResponse(offer2, params.originLocation, params.destinationLocation)
                return [...duffelResponse, ...amadeusResponse]
                // return {directResults, offer2}
            }
            // const ret = await this.getSegment1(flights[0].from, flights[0].layovers)
            // return ret
            const [segment1, segment2, directDuffel, directAmadeus] = await Promise.all([
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
                }),
                this.amadeusClient.searchFlights({
                    departure: params.departureDate,
                    arrival: "1238",
                    locationDeparture: params.originLocation,
                    locationArrival: params.destinationLocation,
                    adults: "1",
                })

            ])
            console.log("Before calling getRoute of flightOfferSearch", (new Date()))
            const response = []
            for (let i = 0; i < segment1.length; i++) {
                const pairs = getRoute(segment1[i], segment2[i])
                response.push(...pairs)
            }
            const directResults = await this.duffelClient.getOfferRequestById(directDuffel.data.id)
            const parsedDirectResults = parseDuffelResponse(directResults);
            console.log("Before Returning", (new Date()))
            return [...parsedDirectResults, ...response]
            // return {segment1, segment2}
        } catch (error) {
            throw error;
        }
    }

    async getSegment1(from: string, layovers: string[]) {
        try {
            console.log("Start of getSegment1", (new Date()))
            const duffelRequestOffers = [], amadeusRequest = []
            layovers.forEach((layover) => {
                // Assuming you have a duffelClient instance already set up
                console.log("Time in mapping segment1 createOffer", (new Date()))
                duffelRequestOffers.push(this.duffelClient.createOfferRequest({
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
                }))
                amadeusRequest.push({
                    amadeus: this.amadeusClient.searchFlights({
                        departure: "2024-08-14",
                        arrival: "1238",
                        locationDeparture: from,
                        locationArrival: layover,
                        adults: "1",
                    })
                })
            });

            // const [duffelData,amadeusData] = await Promise.all([
            //     Promise.all(duffelRequestOffers),
            //     Promise.all(amadeusRequest)
            // ]);
            const duffelData = await Promise.all(duffelRequestOffers);
            const amadeusData = await Promise.all(amadeusRequest);
            console.log("Before Getting getOfferRequest of getSegment1", (new Date()))
            const dataRequest = duffelData.map((response) => {
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const duffelResponse = await Promise.all(dataRequest);
            const parsedDuffelResponse = duffelResponse.map((response) => {
                return parseDuffelResponse(response);
            })
            const parsedAmadeusResponse = amadeusData.map((response) => {
                return parseAmadeusResponse(response, from, "Needs to be fixed");
            })
            return [...parsedDuffelResponse, ...parsedAmadeusResponse];
        } catch (error) {
            throw error
        }
    }

    async getSegment2(to: string, layovers: string[]) {
        try {
            const duffelRequestOffers = [], amadeusRequest = []
            layovers.forEach((layover) => {
                // Assuming you have a duffelClient instance already set up
                console.log("Time in mapping segment1 createOffer", (new Date()))
                duffelRequestOffers.push(this.duffelClient.createOfferRequest({
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
                }))
                amadeusRequest.push({
                    amadeus: this.amadeusClient.searchFlights({
                        departure: "2024-08-14",
                        arrival: "1238",
                        locationDeparture: layover,
                        locationArrival: to,
                        adults: "1",
                    })
                })
            });

            // const [duffelData,amadeusData] = await Promise.all([
            //     Promise.all(duffelRequestOffers),
            //     Promise.all(amadeusRequest)
            // ]);
            const duffelData = await Promise.all(duffelRequestOffers);
            const amadeusData = await Promise.all(amadeusRequest);
            console.log("Before Getting getOfferRequest of getSegment1", (new Date()))
            const dataRequest = duffelData.map((response) => {
                return this.duffelClient.getOfferRequestById(response.data.id);
            })
            const duffelResponse = await Promise.all(dataRequest);
            const parsedDuffelResponse = duffelResponse.map((response) => {
                return parseDuffelResponse(response);
            })
            const parsedAmadeusResponse = amadeusData.map((response) => {
                return parseAmadeusResponse(response, "Needs to be fixed",to);
            })
            return [...parsedDuffelResponse, ...parsedAmadeusResponse];
        } catch (error) {
            throw error
        }
    }

    async amadeusOfferSearch(params: FlightOfferSearchParams) {
        try {
            const flights = flightsRoutes.filter((flight): boolean | void => {
                if (flight.from === params.originLocation && flight.to === params.destinationLocation)
                    return true;

            })
            const [segment1, segment2] = await Promise.all([
                this.amadeusGetSegment1(flights[0].from, flights[0].layovers),
                this.amadeusGetSegment2(flights[0].to, flights[0].layovers)
            ])
            const response = []
            for (let i = 0; i < segment1.length; i++) {
                const pairs = amadeusGetRoute(segment1[i], segment2[i])
                response.push(...pairs)
            }
            return response;

        } catch (error) {
            throw error;

        }
    }


    async amadeusGetSegment1(from: string, layover: string[]) {
        try {
            const firstHalf = layover.map((layover) => {
                return this.amadeusClient.searchFlights({
                    locationDeparture: from,
                    locationArrival: layover,
                    departure: "2024-08-14",
                    arrival: '2024-08-16',
                    adults: "2"



                });
            });
            const offerRequests = await Promise.all(firstHalf);
            return offerRequests;




        } catch (error) {
            throw error

        }
    }


    async amadeusGetSegment2(to: string, layover: string[]) {
        try {
            const secondHalf = layover.map((layover) => {
                return this.amadeusClient.searchFlights({
                    locationDeparture: layover,
                    locationArrival: to,
                    departure: "2024-08-14", //flight can also reach on next date to layover 
                    arrival: '2024-08-16',
                    adults: "2"



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