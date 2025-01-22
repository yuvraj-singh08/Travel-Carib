import { airlines } from "./airlines";

export function getDifferenceInMinutes(time1: string, time2: string): number {
  // Convert the string times into Date objects
  const date1 = new Date(time1);
  const date2 = new Date(time2);

  // Calculate the difference in milliseconds
  const diffInMs = (date2.getTime() - date1.getTime());

  // Convert milliseconds to hours
  const diffInMinutes = diffInMs / (1000 * 60);

  return diffInMinutes;
}

export const getAirlineNameByCode = (id: string): string | undefined => {
  console.log(id);
  const airline = airlines.find((airline) => airline.id === id);
  return airline ? airline.name : undefined;
};

export const getAirlineLogo = (id: string): string | undefined => {
  const airline = airlines.find((airline) => airline.id === id);
  return airline ? airline.logo : undefined;
};

export default function customDateFormat(temp: Date) {
  const date = temp?.getDate();
  const month = temp?.getMonth() + 1;
  const year = temp?.getFullYear();
  const formattedValue = `${year}-${month < 10 ? "0" : ""}${month}-${date < 10 ? "0" : ""}${date}`;
  return formattedValue;
}

export const getPassengerArrays = (passengers: {
  adults: number,
  children: number,
  infants: number
}) => {
  const offerPassengerArray = [], duffelPassengersArray = [], amadeusPassengersArray = [];
  let travelerId = 1;
  for (let i = 0; i < passengers.adults; i++) {
    duffelPassengersArray.push({
      type: 'adult'
    })
    offerPassengerArray.push({
      type: "ADULT"
    })
    amadeusPassengersArray.push({
      id: travelerId++,
      travelerType: "ADULT",
      fareOptions: [
        "STANDARD"
      ]
    },)
  }
  for (let i = 0; i < passengers.children; i++) {
    duffelPassengersArray.push({
      type: 'child'
    }),
      offerPassengerArray.push({
        type: "CHILD"
      })
    amadeusPassengersArray.push({
      id: travelerId++,
      travelerType: "ADULT",
      fareOptions: [
        "STANDARD"
      ]
    },)
  }
  for (let i = 0; i < passengers.infants; i++) {
    duffelPassengersArray.push({
      // type: 'infant_without_seat'
      type: 'adult'
    }),
      offerPassengerArray.push({
        type: "INFANT"
      })
    // amadeusPassengersArray.push({
    //     id: travelerId++,
    //     travelerType: "ADULT",
    //     fareOptions: [
    //         "STANDARD"
    //     ]
    // },)
  }

  return { offerPassengerArray, duffelPassengersArray, amadeusPassengersArray }

}