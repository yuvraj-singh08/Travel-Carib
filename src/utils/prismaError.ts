import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import HttpError from './httperror';

export const handlePrismaError = (error: any) => {
    if (error instanceof PrismaClientValidationError) {
      // Extract the field name and expected type from the error message
      const match = error.message.match(/Argument `(\w+)`: Invalid value provided. Expected ([\w\[\],\s]+), provided (\w+)/);
      
      if (match) {
        const [, fieldName, expectedType, providedType] = match;
        return new HttpError(
          `Invalid value for field '${fieldName}'. Expected ${expectedType}, got ${providedType}`, 
          400
        );
      }
      
      // Fallback for other validation errors
      return new HttpError(error.message, 400);
    }
    
    if (error.code?.startsWith('P2')) {
      return new HttpError('Invalid input data', 400);
    }
  
    return new HttpError('Internal server error', 500);
  };