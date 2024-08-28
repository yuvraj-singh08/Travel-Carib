export interface CreateUserInput {
    email: string;
    password: string;
    name: string;
    mobileCountryCode: string;
    mobileNumber: string;
    nationality?: string;
    gender?: string;
    dateOfBirth?: Date;
    passportNumber?: string;
    passportExpiry?: Date;
    address?: {
      country: string;
      state: string;
      city: string;
      zipCode: string;
      address: string;
    };
    identityCard?: string;
  }
  
  export interface UpdateUserInput {
    name?: string;
    email?: string;
    mobileCountryCode?: string;
    mobileNumber?: string;
    nationality?: string;
    gender?: string;
    dateOfBirth?: Date;
    passportNumber?: string;
    passportExpiry?: Date;
    address?: {
      country?: string;
      state?: string;
      city?: string;
      zipCode?: string;
      address?: string;
    };
    identityCard?: string;
  }
  