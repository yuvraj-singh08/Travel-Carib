import { z } from 'zod';

const coTravellerSchema = z.object({
    title: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dob: z.string(),
    nationality: z.string(),
    gender: z.string(),
    email: z.string(),
    passportNo: z.string(),
    phoneNumber: z.string(),
    passportExpiry: z.string(),
})

type CoTraveller = Required<z.infer<typeof coTravellerSchema>>;

export { CoTraveller, coTravellerSchema }