import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userschema=new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullname:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar:{
        type: String,  //url from cloudinary
        required: true
    },
    coverimage:{
        type: String
    },
    watchhistory:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken:{
        type: String
    }
},{
    timestamps: true
});


userschema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
   this.password=await bcrypt.hash(this.password,10);
   next();
})
// functionality used is save. it means, just befroe the save, we will do this function.


//can not use arrow function for callback. reason: in arrow function, the funciton does not know the context of 'this'. Hence 
//it may get problematic to capture for what the functionality is working.(Ex: the values supposed to be stored in DB); 


userschema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password);
}
userschema.methods.generateAccessToken=function(){
   return jwt.sign(
    {
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
   )
}
userschema.methods.generateRefreshToken=function(){
    return jwt.sign(
    {
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
   )
}
//custom methods
//can call many methods
//methods can access the datas of DB
export const User=mongoose.model("User",userschema)