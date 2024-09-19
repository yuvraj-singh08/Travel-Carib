const mongoose = require('mongoose');
const { Schema } = mongoose;

const passengerSchema = new Schema({
  id: {
    type: String,
    default: () => new mongoose.Types.ObjectId(), // Generate a unique ID using ObjectId
  },
  userId: {
    type: String,
    required: true, // Reference to User's ID
  },
  firstName: {
    type: String,
    required: true, // First name is required
  },
  surname: {
    type: String,
    required: true, // Surname is required
  },
  nationality: {
    type: String,
    required: true, // Nationality is required
  },
  gender: {
    type: String,
    required: true, // Gender is required
  },
  dateOfBirth: {
    type: Date,
    required: true, // Date of birth is required
  },
  passportNumber: {
    type: String,
    required: true, // Passport number is required
  },
  passportExpiry: {
    type: Date,
    required: true, // Passport expiry date is required
  },
  country: {
    type: String,
    required: true, // Country is required
  },
  state: {
    type: String,
    required: true, // State is required
  },
  city: {
    type: String,
    required: true, // City is required
  },
  zipCode: {
    type: String,
    required: true, // Zip code is required
  },
  address: {
    type: String,
    required: true, // Address is required
  },
  identityCard: {
    type: String,
    required: true, // Identity card number is required
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking', // Reference to the Booking model
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Adding an index on userId for faster queries
passengerSchema.index({ userId: 1 });

const Passenger = mongoose.model('Passenger', passengerSchema);
export default Passenger;
