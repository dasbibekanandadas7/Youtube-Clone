import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apierror.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiresponse.js";

const registerUser=asyncHandler(async (req,res) =>{
    // get user details from frontend
    //validation - not empty
    //check if user already exist : check from username and email
    //check if images, check for avatar
    //upload them to cloudinary, check for avatar if uploaded
    //create user object, create DB entry
    //remove password and refresh token from response
    //check if user created
    //return response or send error is error coming

    const {fullname, username, email, password} = req.body;  
    if(
        [fullname,username,email,password].some((field)=> field?.trim==="")
    ){
        throw new apiError(400, "All fields are required");
    }

     // if(fullname==""){
    //    throw new apiError(400, "FullName is required");
    // } possible way for customized logic

    
   const existed_user=User.findOne({
    $or:[{username},{email}]
   });
   if(existed_user){
    throw new apiError(409, "User already exists");
   }

  // better to use optional field of multer file upload. because sometimes the multer may give error. 
  //avatar is the name of the field, [0] will give the first file under the name, path will give the url/path of the uploaded file.
  const avatarLocalPath= req.files?.avatar[0]?.path;
  const coverimageLocalPath=req.files?.coverimage[0]?.path;

  if(!avatarLocalPath){
    throw new apiError(400, "Avatar file is required")
  }


  const avatar=await uploadOnCloudinary(avatarLocalPath);
  const coverimage=await uploadOnCloudinary(coverimageLocalPath);


  if(!avatar){
    throw new apiError(400, "Avatar file is required");
  }

  const user= await User.create({
    fullname,
    avatar:avatar.url,
    coverimage:coverimage?.url || "",
    email,
    password,
    username:username.toLowerCase() 
  })
  
  //check if the data is uploaded or nor and alongwith with that remove password and refreshToken field from response body
  //we could check the user also but this is better approach because it provides select option to remove fields also 
  //with checking
  const createuser=await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createuser){
    throw new apiError(400, "Something went wrong while registering the user");
  }

  return res.status(200).json(
   new apiResponse(200, createuser,"User created Successfully"),
  )


})

export {registerUser};