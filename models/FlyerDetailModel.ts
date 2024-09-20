import mongoose,{Schema} from "mongoose";
const FlyerDetailModel = new Schema({
    userId: {
        type: String,
        // unique: true, 
        // required: true, 
      },
      frequentFlyerNumber: {
        type: String,
        required: true,
      },
      airlines: {
        type: [String],
        required: true,
      },
    //   user: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User', 
    //     // required: true,
    //   },
    }, {
        timestamps: true, 
      });
 const Flyer= mongoose.model("Flyer" , FlyerDetailModel);
 export default Flyer;