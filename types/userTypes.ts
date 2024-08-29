export interface CreateUserInput {
  email: string;
  password: string; 
  mobileNumber: string; 
  fullName: string;
  nickName: string;
  gender: string;
  dateOfBirth: string; 
  pinCode: string;
  address: string;
  profilePhoto: string;
}

export interface CoTravellersInput {
  userId: string;           
  name: string;            
  dateOfBirth: string;      
  passportNumber: string;   
  phoneNumber: string;      
}

export interface ContactDetailInput {
  userId: string;
  email: string;
  phoneNumber: string;
}



export interface PassportDetailInput {
  userId: string;
  passportNumber: string;
  issuingCountry: string;
  expiryDate: string; 
  passportImage: string;
}


export interface FrequentFlyerDetailInput {
  userId: string;
  frequentFlyerNumber: string;
  airline: string;
}




export interface createPassengerInput {
    email: string;
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
  
  export interface UpdatePassengerInput {
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
  