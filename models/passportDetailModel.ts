import mongoose,{Schema} from "mongoose";

// const mongoose = require('mongoose');
// const { Schema } = mongoose;

const passportDetailSchema = new Schema({
  
  userId: {
    type: String,
    unique: true, 
    // required: true, 
  },
  passportNumber: {
    type: String,
    required: true, 
  },
  issuingCountry: {
    type: String,
    required: true, 
  },
  expiryDate: {
    type: Date,
    required: true, 
  },
  passportImage: {
    type: String,
    // required: true, 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    // required: true,
  },
}, {
  timestamps: true, 
});


passportDetailSchema.index({ userId: 1 });

 const PassportDetail = mongoose.model('PassportDetail', passportDetailSchema);
export default PassportDetail;
