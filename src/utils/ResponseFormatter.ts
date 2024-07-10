class ResponseFormatter {
    static formatAmadeus(data: any): any[] {
      // Transform Amadeus response to standard format
      return data.map((flight: any) => ({
        id: flight.id,
        source: 'Amadeus',
        // other necessary fields
      }));
    }
  
    static formatDuffel(data: any): any[] {
      // Transform Duffel response to standard format
      return data.map((flight: any) => ({
        id: flight.id,
        source: 'Duffel',
        // other necessary fields
      }));
    }
  
    static formatKiu(data: any): any[] {
      // Transform KIU response to standard format
      return data.map((flight: any) => ({
        id: flight.id,
        source: 'KIU',
        // other necessary fields
      }));
    }
  }
  
  export default ResponseFormatter;
  