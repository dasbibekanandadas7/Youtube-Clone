import mongoose, {Schema} from "mongoose";

const subscriptionSchema=new Schema({
  subscriber:{
    type:Schema.Types.ObjectId, // the user who subscribed my channel
    ref:"User"
  },
  channel:{
    type:Schema.Types.ObjectId, // the channels I have subscribed to
    ref: "User"
  }
},{timestamps:true});

export const Subscription=mongoose.model("Subscription", subscriptionSchema);