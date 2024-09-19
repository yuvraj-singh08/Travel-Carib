import mongoose,{Schema} from "mongoose";
const userModel = new Schema({
    firstName: {
        type: String,
        // required: true,
      },
     lastName: {
        type: String,
        // required: true,
      },
      gender: {
        type: String,
        // required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true, // Email should be unique
      },
      mobileNumber: {
        type: String,
        // required: true,
      },
      dateOfBirth:{
        type: Date,
        // required: true,
      },
      pincode: {
      type: String,
        // required: true,
      },
      address: {
        type: String,
        // required: true,
      },
      password: {
        type: String,
        required: true,
      },
      profilePhoto: {
        type: String,
        // required: true,
      },
     
});
 const User= mongoose.model("User" , userModel);
 export default User;