import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apierror.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens=async(userId)=>{
  try {
    
    const user= await User.findById(userId);
    const accessToken= user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();


    user.refreshToken= refreshToken;
    await user.save({validateBeforeSave: false}); //save method is provided by mongoose

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
  //if there is no coverimage provided, wheather we pass the value or totally avaoiding passing of coverimage, there will be no
  //coverimage array.  Hence it will show error in undefined [0];
  
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

   if(!username && !email){
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
   
  const loggedInUser=await User.findById(user._id).select("-password -refreshToken"); 

  const options={
    httpOnly: true,
    secure: true
  } 


  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new apiResponse(200,{
      user: loggedInUser,accessToken // suppose user want to save the accessToken and refreshToken somewhere
    },
    "User Logged in successfully"
    )
  )

})

const logoutUser=asyncHandler(async(req, res)=>{
  //remove accessToken and refreshToken
  //the req is coming from the usermiddleware->verifyjwt function, here the req..user is added in the req by function JWTverify.
  // req is having _id, bcz in refreshToken we have given parameter _id only. that will be created by mongoDB.
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

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new apiError(401,"Unauthorized request");
  }

  try{
    const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user=await User.findById(decodedToken?._id);

    if(!user){
    throw new apiError(401, "Invalid refresh Token");
    }

    // incoming refresh token is the one provied with user request (POSTMAN), user.refreshToken is the one saved in DB.
  if(incomingRefreshToken!==user?.refreshToken){
    throw new apiError(401, "Refresh token is expired or used");
  }
  //the user here is coming from "generateAccessAndRefreshTokens" function. we have saved refreshToken value in the 
  // user.refreshToken, here we got user from "User.findById(decodedToken?._id)". We checked this user.refreshToken with 
  //new refreshToken provided. If check is true then we created newrefreshToken and accessToken.


  const options={
    httpOnly: true,
    secure: true
  }

  const{accessToken, newrefreshToken}=await generateAccessAndRefreshTokens(user._id);
  return res.status(200)
  .cookie("accessToken", accessToken)
  .cookie("refreshToken", newrefreshToken)
  .json(
    new apiResponse(200, {
      accessToken
    },"Access Token Refreshed")
  )
  }
  catch(error){
     throw new apiError(401, error?.message||"invalid refresh token")
  }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldpassword, newpassword}= req.body;
  const user=await User.findById(req.user?._id);

  const isPasswordCorrect=await user.isPasswordCorrect(oldpassword);
  if(!isPasswordCorrect){
    throw new apiError(400, "Old password is incorrect");
  };

  user.password=newpassword;
  await user.save({validateBeforeSave:false})
  
  return res.status(200).json(
    new apiResponse(200,{},"Password changed Successfully")
  )
});

const getCurrentUser=asyncHandler(async(req,res)=>{
  return res.status(200)
  .json(new apiResponse(200, req.user, "Current user fetched Successfully"));
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullname, email}=req.body;
  if(!fullname || !email){
    throw new apiError(400, "All fields are required");
  }
  const user=User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname: fullname,
        email: email
      }
    },{
      new: true
    }
  ).select("-password -refreshToken");

  return res.status(200)
  .json(new apiResponse(200,user, "Account details updated Successfully"));
})
//for files updation better to keep another controller

const updateUserAvatar=asyncHandler(async(req,res)=>{
  const avatarlocalpath=req.file?.path;
  if(!avatarlocalpath) {
    throw new apiError(400, "avatar file is missing");
  } 
    const avatar=await uploadOnCloudinary(avatarlocalpath);
    if(!avatar){
       throw new apiError(400, "avatar file upload failed");
    }
  
  const user= await User.findByIdAndUpdate(
     req.user._id,
     {
      $set:{
        avatar: avatar.url}
     },{
      new: true
     }
  ).select("-password -refreshToken");
  //when we update something, the new:true will return the updated document. In mongoose it is designed to give the whole
  //new document without excluding anything even if we have excluded some features before. So we again use select to exclude.

  return res.status(200)
  .json(new apiResponse(200,user, "Avatar updated Successfully"));
});
//Optimise: delete the old avatar file/photo from cloudinary. craete a utility function.

const updateUserCoverImage=asyncHandler(async(req,res)=>{
  const coverimagelocalpath=req.file?.path;
  if(!coverimagelocalpath) {
    throw new apiError(400, "coverimage file is missing");
  } else {
    const coverimage=await uploadOnCloudinary(coverimagelocalpath);
    if(!coverimage){
       throw new apiError(400, "coverimage file upload failed");
    }
  }
  const user= await User.findByIdAndUpdate(
     req.user._id,
     {
      $set:{
        coverimage: coverimage.url}
     },{
      new: true
     }
  ).select("-password -refreshToken");

  return res.status(200)
  .json(new apiResponse(200,user, "CoverImage updated Successfully"));
});

const getUserChannelProfile=asyncHandler(async(req, res)=>{
   const {username}=req.params;
   if(!username?.trim()){
    throw new apiError(400, "username is required");
   }

  //  User.findOne({username}); one possible way to get the user

  //otherwise it is better way
  const channel= await User.aggregate([
    {
      $match: username
      ? { username: new RegExp(`^${username}$`, "i") } // match entire string, ignore case
      : {} // if username not provided, match all users (empty filter) nothing will be matched
    },
    {
      $lookup:{
        from:"subscriptions",  //mongoDB Stores key as plural of model name
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },{
      $lookup:{
        from:"subscriptions",  //mongoDB Stores key as plural of model name
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
        subscriberCount:{
          $size:"$subscribers",
        },
        channelSubscribedToCount:{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in: [req.user?._id,"$subscribers.subscriber"]},
              then: true,
              else: false
          }
        }
        //This checks: “Is the currently logged-in user in the list of subscribers for this channel?”
      }
    },{
      $project:{
        fullname:1,
        username:1,
        subscriberCount:1,
        channelSubscribedToCount:1,
        isSubscribed:1,
        avatat:1,
        coverimage:1,
        email:1
      }
    }
  ])
  // $project in MongoDB aggregation controls which fields are included in the output.
  //Keep fields (1 = include) .Exclude fields (0 = exclude)
  //$project determines what fields are sent to the client.

  if(!channel?.length){
   throw new apiError(404, "Channel doesn't exist");
  }

  return res
  .status(200)
  .json(new apiResponse(200,channel[0],"user channel fetched Successfully"));
  //channel[0] gives the first object of the array. as we checking one username. if we add extra username in params or manually 
  //in code, it will give the both objects of the array with channel instaed of channel[0].
  // const extraUsername = "Alice";
  // const channels = await User.aggregate([
  //   {
  //     $match: {
  //       username: { $in: [username, extraUsername] } // match both usernames
  //     }
  //   },

})




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
};