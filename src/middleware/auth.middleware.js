import { apiError } from "../utils/apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT=asyncHandler(async(req, _, next)=>{
  try {
     const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
     // sometimes user want to create token by himself. It is stored inside header. So we can pull the token from there
  
     if(!token){
      throw new apiError(401, "Unauthorized request");
     }
  
     const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
     const user= await User.findById(decodedToken?._id).select("-password -refreshToken");
  
     if(!user){
      
      throw new apiError(401, "Invalid Access Token");
     }
   
     req.user=user;
     // a new key value pair added in the request object. we can access anything using req.user.
     next();
  } catch (error) {
    throw new apiError(401, error?.message|| "Invalid access token");
  }
});
// this middleware used to know if user is logged in or not
