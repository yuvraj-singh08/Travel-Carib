import mongoose,{Schema} from "mongoose";


const coTravellersSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,  // If userId is optional
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  passportNumber: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,  // Automatically adds createdAt and updatedAt fields
});
const CoTravellers = mongoose.model('CoTravellers', coTravellersSchema);
export default CoTravellers;

