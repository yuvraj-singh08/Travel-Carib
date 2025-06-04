import redis from "../../config/redis";
import { AggregatedFareBrand, DbBaggageType, FareBrandType, GdsBaggageType, OfferPassengerType, UtilBaggageType } from "../../types/flightTypes";
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

export const transformMultiCityBaggageDetailForPassengers = (baggageDetailForAllItenaries: GdsBaggageType[][][], passengers: OfferPassengerType[]) => {
  const baggageDetailsForPassengers = baggageDetailForAllItenaries.map((itenaryBaggage, itenaryIndex) => {
    const passengerBaggageMap = new Map<string, UtilBaggageType[][]>();
    itenaryBaggage.forEach((baggageDetails, sliceIndex) => {

      // passengers.forEach((passenger) => {
      //   const baggageData = passengerBaggageMap.get(passenger.id) || [];
      //   const baggageDetailForThisPassenger = baggageDetails.filter((baggageDetail) => baggageDetail.passenger_ids[0] == passenger.gds_passenger_id[index]);
      //   const parsedBaggageDetailForThisPassenger = baggageDetailForThisPassenger.map((baggageDetail): UtilBaggageType => {
      //     return {
      //       weightInKg: baggageDetail.metadata.maximum_weight_kg,
      //       type: baggageDetail.type,
      //       maxQuantity: baggageDetail.maximum_quantity,
      //       price: parseFloat(baggageDetail.total_amount),
      //       currency: baggageDetail.total_currency,
      //       serviceId: baggageDetail.id
      //     }
      //   })
      //   baggageData.push(parsedBaggageDetailForThisPassenger);
      //   passengerBaggageMap.set(passenger.id, baggageData)
      // })
    })

    const optimalPassengerBaggageMap = new Map<string, DbBaggageType[]>();

    passengerBaggageMap.forEach((passengerBaggage, key: string) => {
      const parsedBaggage = findOptimalCombinations(passengerBaggage);
      optimalPassengerBaggageMap.set(key, parsedBaggage);

    })

    return optimalPassengerBaggageMap;
  })
}

export const transformBaggageDetailForPassengers = (baggageDetailForAllSlices: GdsBaggageType[][], passengers: OfferPassengerType[]) => {

  const passengerBaggageMap = new Map<string, UtilBaggageType[][]>();
  baggageDetailForAllSlices.map((baggageDetails, index) => {

    passengers.forEach((passenger) => {
      const baggageData = passengerBaggageMap.get(passenger.id) || [];
      const baggageDetailForThisPassenger = baggageDetails.filter((baggageDetail) => baggageDetail.passenger_ids[0] == passenger.gds_passenger_id[index]);
      const parsedBaggageDetailForThisPassenger = baggageDetailForThisPassenger.map((baggageDetail): UtilBaggageType => {
        return {
          weightInKg: baggageDetail.metadata.maximum_weight_kg,
          type: baggageDetail.type,
          maxQuantity: baggageDetail.maximum_quantity,
          price: parseFloat(baggageDetail.total_amount),
          currency: baggageDetail.total_currency,
          serviceId: baggageDetail.id
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


function findOptimalCombinations(legs: UtilBaggageType[][]): DbBaggageType[] {
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

    // Calculate total price and collect service IDs
    let totalPrice = 0;
    const serviceIds: string[] = [], prices: number[] = [];
    let isValid = true;

    for (const leg of legs) {
      const validOptions = leg.filter(opt =>
        opt.weightInKg >= weight && opt.maxQuantity >= maxCount
      );

      if (validOptions.length === 0) {
        isValid = false;
        break;
      }

      // Find the cheapest valid option for this leg
      const cheapestOption = validOptions.reduce((min, curr) =>
        curr.price < min.price ? curr : min, validOptions[0]);

      totalPrice += cheapestOption.price;
      serviceIds.push(cheapestOption.serviceId);
      prices.push(cheapestOption.price);
    }

    if (isValid) {
      combinations.push({
        weightInKg: weight,
        type: 'checked',
        maxQuantity: maxCount,
        price: totalPrice,
        currency: "USD", // Assuming currency is consistent across legs
        serviceIds: serviceIds,
        prices
      });
    }
  }

  // Filter out dominated combinations
  const nonDominated = combinations.filter((current, _, arr) =>
    !arr.some(other =>
      other !== current &&
      other.weightInKg >= current.weightInKg &&
      other.maxQuantity >= current.maxQuantity &&
      other.price <= current.price
    )
  );

  // Sort by descending weight, then ascending price
  return nonDominated.sort((a, b) =>
    b.weightInKg - a.weightInKg || a.price - b.price
  );
}

export const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const getNextDay = (dateStr) => {
  let date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0]; // Returns in YYYY-MM-DD format
}

export function findCommonFareBrands(fareBrandArrays: FareBrandType[][]): AggregatedFareBrand[] {
  if (!fareBrandArrays.length) return [];
  if (fareBrandArrays.length === 1) {
    return fareBrandArrays[0].map(fb => ({
      ...fb,
      offerIds: [fb.offerId]
    }));
  }

  // Get unique fare brand names from first array
  const firstArrayBrands = new Set(
    fareBrandArrays[0].map(fb => fb.fareBrand)
  );

  // Find common brand names across all arrays
  const commonBrandNames = Array.from(firstArrayBrands).filter(brandName =>
    fareBrandArrays.every(array =>
      array.some(fb => fb.fareBrand === brandName)
    )
  );

  // For each common brand, aggregate the data
  return commonBrandNames.map(brandName => {
    // Get all occurrences of this brand across all arrays
    const allOccurrences = fareBrandArrays.flatMap(array =>
      array.filter(fb => fb.fareBrand === brandName)
    );

    return {
      fareBrand: brandName,
      // Sum of all totalAmounts
      totalAmount: allOccurrences.reduce(
        (sum, fb) => sum + fb.totalAmount,
        0
      ),
      // Minimum of all cabinBaggage
      cabinBaggage: Math.min(
        ...allOccurrences.map(fb => fb.cabinBaggage)
      ),
      // Minimum of all checkedBaggage
      checkedBaggage: Math.min(
        ...allOccurrences.map(fb => fb.checkedBaggage)
      ),
      // Array of all offerIds
      offerIds: allOccurrences.map(fb => fb.offerId)
    };
  });
}

export function reorganizeFareCodes(data: string[][]): string[][] {
  if (!data || data.length === 0) return [];
  
  // Find all unique codes across all segments
  const allCodes = new Set<string>();
  data.forEach(segment => {
    segment.forEach(code => {
      allCodes.add(code);
    });
  });
  
  // Create a frequency map for each code
  const codeFrequency = {};
  allCodes.forEach(code => {
    codeFrequency[code] = 0;
  });
  
  // Count total occurrences of each code across all positions
  data.forEach(segment => {
    segment.forEach(code => {
      codeFrequency[code]++;
    });
  });
  
  // Sort codes by frequency (descending)
  const sortedCodes = Object.keys(codeFrequency).sort((a, b) => 
    codeFrequency[b] - codeFrequency[a]
  );
  
  // Reorganize each segment based on code frequency
  const result = data.map(segment => {
    // Create a copy of the segment to avoid modifying the original
    const segmentCopy = [...segment];
    const newSegment = [];
    
    // First add codes from the sorted list that exist in this segment
    sortedCodes.forEach(code => {
      const index = segmentCopy.indexOf(code);
      if (index !== -1) {
        newSegment.push(code);
        // Remove the code to handle duplicates correctly
        segmentCopy.splice(index, 1);
      }
    });
    
    // Add any remaining codes that weren't in our sorted list
    // (This should not happen with the current implementation but added for robustness)
    newSegment.push(...segmentCopy);
    
    return newSegment;
  });
  
  return result;
}

export async function cacheResponseInChunks(searchKey, data, chunkSize = 1000) {
  try {
    const chunks = [];

    // Split data into chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    // Store metadata
    const metadata = {
      totalItems: data.length,
      totalChunks: chunks.length,
      chunkSize: chunkSize,
      cachedAt: new Date().toISOString()
    };

    // Store all chunks and metadata in parallel
    const cachePromises = [
      // Store metadata
      redis.set(`${searchKey}:meta`, JSON.stringify(metadata), "EX", 60 * 10),
      // Store each chunk
      ...chunks.map((chunk, index) =>
        redis.set(
          `${searchKey}:chunk:${index}`,
          JSON.stringify(chunk),
          "EX", 60 * 10
        )
      )
    ];

    await Promise.all(cachePromises);
    console.log(`Cached ${data.length} items in ${chunks.length} chunks for key: ${searchKey}`);

  } catch (error) {
    console.error('Error caching response in chunks:', error);
    // Fallback: try to cache first 200 items only
    try {
      const fallbackData = data.slice(0, 200);
      await redis.set(`${searchKey}:fallback`, JSON.stringify(fallbackData), "EX", 60 * 10);
      console.log('Fallback cache successful');
    } catch (fallbackError) {
      console.error('Fallback cache also failed:', fallbackError);
    }
  }
}

export async function getCachedResponse(searchKey) {
  try {
    // Try to get metadata first
    const metadataStr = await redis.get(`${searchKey}:meta`);

    if (!metadataStr) {
      // Check for fallback cache
      const fallbackStr = await redis.get(`${searchKey}:fallback`);
      return fallbackStr ? JSON.parse(fallbackStr) : null;
    }

    const metadata = JSON.parse(metadataStr);

    // Get all chunks in parallel
    const chunkPromises = [];
    for (let i = 0; i < metadata.totalChunks; i++) {
      chunkPromises.push(redis.get(`${searchKey}:chunk:${i}`));
    }

    const chunkResults = await Promise.all(chunkPromises);

    // Check if any chunk is missing
    const missingChunks = chunkResults.some(chunk => chunk === null);
    if (missingChunks) {
      console.warn(`Some chunks missing for key: ${searchKey}`);
      // Try fallback
      const fallbackStr = await redis.get(`${searchKey}:fallback`);
      return fallbackStr ? JSON.parse(fallbackStr) : null;
    }

    // Combine all chunks
    const combinedData = [];
    chunkResults.forEach(chunkStr => {
      if (chunkStr) {
        const chunkData = JSON.parse(chunkStr);
        combinedData.push(...chunkData);
      }
    });

    console.log(`Retrieved ${combinedData.length} items from ${metadata.totalChunks} chunks`);
    return combinedData;

  } catch (error) {
    console.error('Error retrieving cached response:', error);
    // Try fallback cache
    try {
      const fallbackStr = await redis.get(`${searchKey}:fallback`);
      return fallbackStr ? JSON.parse(fallbackStr) : null;
    } catch (fallbackError) {
      console.error('Fallback retrieval also failed:', fallbackError);
      return null;
    }
  }
}

// Optional: Method to get specific chunks for pagination
export async function getCachedChunk(searchKey, chunkIndex) {
  try {
    const chunkStr = await redis.get(`${searchKey}:chunk:${chunkIndex}`);
    return chunkStr ? JSON.parse(chunkStr) : null;
  } catch (error) {
    console.error(`Error retrieving chunk ${chunkIndex}:`, error);
    return null;
  }
}

// Optional: Method to get cache info
export async function getCacheInfo(searchKey) {
  try {
    const metadataStr = await redis.get(`${searchKey}:meta`);
    return metadataStr ? JSON.parse(metadataStr) : null;
  } catch (error) {
    console.error('Error retrieving cache info:', error);
    return null;
  }
}

// Cleanup method to remove all chunks for a search key
export async function clearCache(searchKey) {
  try {
    const metadata = await this.getCacheInfo(searchKey);
    if (metadata) {
      const deletePromises = [
        redis.del(`${searchKey}:meta`),
        redis.del(`${searchKey}:fallback`)
      ];

      for (let i = 0; i < metadata.totalChunks; i++) {
        deletePromises.push(redis.del(`${searchKey}:chunk:${i}`));
      }

      await Promise.all(deletePromises);
      console.log(`Cleared cache for key: ${searchKey}`);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

export function* mergeOffers(...lists) {
  for (const list of lists) {
    for (const item of list) {
      yield item;
    }
  }
}