import { DbBaggageType, GdsBaggageType, OfferPassengerType } from "../../types/flightTypes";
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

export const transformBaggageDetailForPassengers = (baggageDetailForAllSlices: GdsBaggageType[][], passengers: OfferPassengerType[]) => {

  const passengerBaggageMap = new Map<string, DbBaggageType[][]>();
  baggageDetailForAllSlices.map((baggageDetails, index) => {

    passengers.forEach((passenger) => {
      const baggageData = passengerBaggageMap.get(passenger.id) || [];
      const baggageDetailForThisPassenger = baggageDetails.filter((baggageDetail) => baggageDetail.passenger_ids[0] == passenger.gds_passenger_id[index]);
      const parsedBaggageDetailForThisPassenger = baggageDetailForThisPassenger.map((baggageDetail): DbBaggageType => {
        return {
          weightInKg: baggageDetail.metadata.maximum_weight_kg,
          type: baggageDetail.type,
          maxQuantity: baggageDetail.maximum_quantity,
          price: parseFloat(baggageDetail.total_amount),
          currency: baggageDetail.total_currency
        }
      })
      baggageData.push(parsedBaggageDetailForThisPassenger);
      passengerBaggageMap.set(passenger.id, baggageData)
    })
  })

  const optimalPassengerBaggageMap = new Map<string, DbBaggageType[]>();

  passengerBaggageMap.forEach((passengerBaggage, key: string) => {
    const parsedBaggage = findOptimalCombinations(passengerBaggage);
    optimalPassengerBaggageMap.set(key, parsedBaggage);

  })

  return optimalPassengerBaggageMap;
}


function findOptimalCombinations(legs: DbBaggageType[][]) {
  // Collect all unique weights from all legs
  const allWeights = new Set<number>();
  legs.forEach(leg => {
    leg.forEach(option => allWeights.add(option.weightInKg));
  });
  const sortedWeights = Array.from(allWeights).sort((a, b) => b - a);

  // Filter weights that are allowed by all legs
  const allowedWeights = sortedWeights.filter(weight =>
    legs.every(leg => leg.some(option => option.weightInKg >= weight))
  );

  // Generate all valid combinations
  const combinations: DbBaggageType[] = [];
  for (const weight of allowedWeights) {
    // Calculate maximum possible maxCount for this weight
    const maxCountsPerLeg = legs.map(leg =>
      Math.max(...leg.filter(opt => opt.weightInKg >= weight)
        .map(opt => opt.maxQuantity))
    );
    const maxCount = Math.min(...maxCountsPerLeg);

    // Calculate total price for this combination
    let totalPrice = 0;
    for (const leg of legs) {
      const validOptions = leg.filter(opt =>
        opt.weightInKg >= weight && opt.maxQuantity >= maxCount
      );
      if (validOptions.length === 0) {
        totalPrice = Infinity;
        break;
      }
      totalPrice += Math.min(...validOptions.map(opt => opt.price));
    }

    if (totalPrice !== Infinity) {
      combinations.push({
        weightInKg: weight,
        type: 'checked',
        maxQuantity: maxCount,
        price: totalPrice,
        currency: "USD"
      });
    }
  }

  // Filter out dominated combinations
  const nonDominated = [];
  for (const current of combinations) {
    let isDominated = false;
    for (const other of combinations) {
      if (other === current) continue;
      if (other.weightInKg >= current.weightInKg &&
        other.maxQuantity >= current.maxQuantity &&
        other.price <= current.price) {
        isDominated = true;
        break;
      }
    }
    if (!isDominated) nonDominated.push(current);
  }

  // Sort by descending weight, then ascending price
  return nonDominated.sort((a, b) =>
    b.weight - a.weight || a.price - b.price
  );
}