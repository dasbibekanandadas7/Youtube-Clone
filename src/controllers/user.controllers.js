import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apierror.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiresponse.js";

const generateAccessAndRefreshTokens=async(userId)=>{
  try {
    const user= await User.findById(userId);
    const accessToken= user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();

    user.refreshToken= refreshToken;
    await user.save({validationBeforeSave: false}); //save method is provided by mongoDB
    // when the refreshToken is saved, the mongoose values (usename, password, email etc (required fields) get activated and 
    // ask for validation (basically it runs again and ask for values to save agin). But as we have not given any other value in
    //  the save. it may cause error here. so we give validationBeforeSave: false; it means don't validate anything just save.
    
    return {accessToken, refreshToken};

  } catch (error) {
    throw new apiError(500, "Something went wrong while generating token")
  }
}

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
        [fullname,username,email,password].some((field)=> field?.trim()==="")
    ){
        throw new apiError(400, "All fields are required");
    }

     // if(fullname==""){
    //    throw new apiError(400, "FullName is required");
    // } possible way for customized logic

    
   const existed_user=await User.findOne({
    $or:[{username},{email}]
   });
   if(existed_user){
    throw new apiError(409, "User already exists");
   }

  // better to use optional field of multer file upload. because sometimes the multer may give error. 
  //avatar is the name of the field, [0] will give the first file under the name, path will give the url/path of the uploaded file.
  const avatarLocalPath= req.files?.avatar[0]?.path;
  // const coverimageLocalPath=req.files?.coverimage[0]?.path;
  
  let coverimageLocalPath;
  if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0){
    coverimageLocalPath=req.files.coverimage[0].path;
  }

  if(!avatarLocalPath){
    throw new apiError(400, "Avatar file is required")
  }

  
   
  const avatar=await uploadOnCloudinary(avatarLocalPath);
  const coverimage=await uploadOnCloudinary(coverimageLocalPath);
  
  if(!avatar){
    throw new apiError(400, "Avatar file is not uploaded");
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

//auth middleware. custom middleware created by us. it only verify is user exist or not

const loginUser=asyncHandler(async(req, res)=>{
   //data from req body
   //username or email given by user or not
   //find the user
   //check password
   //access and refresh token created
   //send cookie
   //send response


   const {email, username, password}=req.body;

   if(!username || !email){
    throw new apiError(400, "username or email is required");
   }

   //check if either email or username is provided ($or is provided by mongoose)
   //findOne-> if any of the value is found, it returns the object validated
   const user= await User.findOne({
    $or:[{username},{email}]
  })

  if(!user){
   throw new apiError(404, "user doesn't exist");
  }

  const isPasswordValid=await user.isPasswordCorrect(password);
  if(!isPasswordValid){
   throw new apiError(401, "Incorrect Password");
  }

  //access and refresh token generation is a recurring process. it is done many times in the project. So we created a 
  //method to use it again and again
  
  const{accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id);
   
  const loggedInUser=await User.findById(user._id).select("-password refreshToken");

  const options={
    httpOnly: true,
    secure: true
  }

  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options).
  json(
    new apiResponse(200,{
      user: loggedInUser,accessToken,refreshToken // suppose user want to save the accessToken and refreshToken somewhere
    },
    "User Logged in successfully"
    )
  )

})

const logoutUser=asyncHandler(async(req, res)=>{
  //remove accessToken and refreshToken
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options={
    httpOnly: true,
    secure: true
  }
   
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refresh_token", options)
  .json( new apiResponse(200,{}, "User Logged out Successfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser
};