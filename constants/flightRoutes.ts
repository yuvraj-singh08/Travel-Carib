import { routeType } from "../types/flightTypes"

export const flightsRoutes = [
    {
        from: "VLN",
        to: "MIA",
        layovers: ["BOG", "SDQ"]
    },
    {
        from: "CCS",
        to: "SDQ",
        layovers: ["PTY", "BOG"]
    }
]

export const routesData: routeType[] =[
    {
        origin:"CCS",
        destination: "BOG"
    },
    {
        origin:"CCS",
        destination: "MDE"
    },
    {
        origin:"CCS",
        destination: "LIM"
    },
    {
        origin:"CCS",
        destination: "CUR"
    },
    {
        origin:"CCS",
        destination: "VVI"
    },
    {
        origin:"CCS",
        destination: "POS"
    },
    {
        origin:"CCS",
        destination: "SCL"
    },
    {
        origin:"CCS",
        destination: "BGI"
    },
    {
        origin:"CCS",
        destination: "HAV"
    },
    {
        origin:"CCS",
        destination: "NLU"
    },
    {
        origin:"CCS",
        destination: "CUN"
    },
    {
        origin:"CCS",
        destination: "VKO"
    },
    {
        origin:"CCS",
        destination: "PTY"
    },
    {
        origin:"BRM",
        destination: "PTY"
    },
    {
        origin:"BLA",
        destination: "PTY"
    },
    {
        origin:"MAR",
        destination: "PTY"
    },
    {
        origin:"VLN",
        destination: "PTY"
    },
    {
        origin:"CCS",
        destination: "SDQ"
    },
    {
        origin:"SDQ",
        destination: "SJU"
    },
    {
        origin:"SJU",
        destination: "MIA"
    },
    {
        origin:"PTY",
        destination:"CCS"
    },
    {
        origin:"SDQ",
        destination: "MIA"
    },
    {
        origin:"SDQ",
        destination: "PTY"
    },
    {
        origin:"PTY",
        destination: "MIA"
    },
    {
        origin:"VLN",
        destination: "SDQ"
    },
    {
        origin:"VLN",
        destination: "BOG"
    },
    {
        origin:"BOG",
        destination:"MIA"
    },
    {
        origin:"SDQ",
        destination:"MIA"
    }
]