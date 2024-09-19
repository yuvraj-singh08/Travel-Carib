import mongoose,{Schema} from "mongoose";

const bookingSchema = new Schema({
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Passenger',  // Reference to the Passenger model
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  flightNumber: {
    type: String,
    required: true,
  },
  seatNumber: {
    type: String,
    required: true,
  },
  paymentId: {
    type: String,
    unique: true,  // Optional, but must be unique if present
  },
  status: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,  // Automatically set current date when created
  },
  updatedAt: {
    type: Date,
    default: Date.now,  // Automatically set current date when updated
  },
});

// Automatically update the `updatedAt` field when the document is modified
bookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
