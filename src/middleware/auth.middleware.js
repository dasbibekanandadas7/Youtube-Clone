import { apiError } from "../utils/apierror";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models";

export const verifyJWT=asyncHandler(async(req, _, next)=>{
  try {
     const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
     // somethimes user want to create token by himself. It is stored inside header. So we can pull the token from there
  
     if(!token){
      throw new apiError(401, "Unauthorized request");
     }
  
     const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
     const user= await User.findById(decodedToken?._id).select("-password -refreshToken");
  
     if(!user){
      //about frontend
      throw new apiError(401, "Invalid Access Token");
     }
  
     req.user=user;
     next();
  } catch (error) {
    throw new apiError(401, error?.message|| "Invalid access token");
  }
});
// this middleware used to know if user is logged in or not
