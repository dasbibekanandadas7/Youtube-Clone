import { asyncHandler } from "../utils/asyncHandler";
import { apiError } from "../utils/apierror.js";
import {Tweet} from "../models/tweet.models.js";
import mongoose, { isValidObjectId } from "mongoose";
import {User} from "../models/user.models.js";
import { apiResponse } from "../utils/apiresponse.js";

const createTweet=asyncHandler(async(req,res)=>{
   const{content}=req.body;

  if(!content){
    throw new apiError(400, "Content is required");
  }

  const newTweet=await Tweet.create({
    content,
    owner: req.user._id
  })
  
  if(!newTweet){
    throw new apiError(500, "Unable to create tweet");
  }

  return res.status(200)
  .json(new apiResponse(200, newTweet, "Tweet created successfully"));

});

const updateTweet=asyncHandler(async(req,res)=>{
  const {tweetid}=req.params;
  const {content}=req.body;

  if(!content){
    throw new apiError(400, "Content is required");
  }

  if(!isValidObjectId(tweetid)){
    throw new apiError(400, "Invalid tweet id");
  }
  // It checks whether a given value is a valid MongoDB ObjectId. Returns true or false. 
  //MongoDB _id fields are ObjectIds. 12-byte binary values, usually represented as a 24-character hex string
  //it gives error for wrong type of ObjectId like string, number etc or null or undefined

  const tweet=await Tweet.findById(tweetid);
  if(!tweet){
    throw new apiError(404, "Tweet not found");
  }

  if(!tweet.owner.equals(req.user._id)){
     throw new apiError(400, "only owner can edit thier tweet");
  }
    //Always use .equals() when comparing MongoDB ObjectIds.
    //=== is also a method 

    // if (tweet?.owner.toString() !== req.user?._id.toString()) {
    //     throw new ApiError(400, "only owner can edit thier tweet");
    // }
    //this is also a method to compare but as in verifyJWT provides user._id as a Object(nothing changed).
    //so we can use the upper method. but to optimise or eliminate error we can do this way 

  const newTweet=await Tweet.findByIdAndUpdate(
    tweetid,
    {
      $set:{
         content:content
      }
    },
    {new: true}
  )

   if (!newTweet) {
        throw new apiError(500, "Failed to edit tweet please try again");
    }

    return res
        .status(200)
        .json(new apiResponse(200, newTweet, "Tweet updated successfully"));

});

const deleteTweet=asyncHandler(async(req,res)=>{
  const {tweetid}=req.params;
  if(!isValidObjectId(tweetid)){
    throw new apiError(400, "Invalid tweet id");
  }

  const tweet=await Tweet.findById(tweetid);
  if(!tweet){
    throw new apiError(404, "Tweet not found");
  }

   if(!tweet.owner.equals(req.user._id)){
     throw new apiError(400, "only owner can edit thier tweet");
  }
  
  await Tweet.findByIdAndDelete(tweetid);

   return res
        .status(200)
        .json(new apiResponse(200, tweet.content, "Tweet deleted successfully"));
});

const getUserTweets=asyncHandler(async(req,res)=>{
  const {username}=req.params;
  if(!username?.trim()){
      throw new apiError(400, "username is required");
  }

  // const userId=req.user._id............... why? You are always using req.user._id, which is the logged-in user’s ID.
// If the route is /tweets/:username, the user might be requesting another user’s tweets, e.g., /tweets/Alice.
// So your aggregation ignores :username entirely and just returns the logged-in user’s tweets.

const user = await User.findOne({ username: new RegExp(`^${username}$`, "i") });// whose tweets you want to see, e.g., Alice or Bob
                                                                            //can see tweets of any user from my logged in page
if (!user) throw new apiError(404, "User not found");

const userId = user._id;

  const usertweets=await Tweet.aggregate([
    {
      $match: 
         {
           owner: new mongoose.Types.ObjectId(userId),
          //  MongoDB cannot compare a string to an ObjectId directly.
         },
    },{
      $lookup:{
        from:"users",
        localField:"owner",
        foreignField:"_id",
        as:"ownerDetails", 
        pipeline:[
          {
            $project:{
                 username: 1,
                 avatar:1
            }// as it will give my all tweets, it will add my username and avatar for all tweets, saved in array
            //as: ownerDetails:[{username"Bibek",avatar:xyz.jpg},{username"Bibek",avatar:xyz.jpg}...]
          }
        ]
      }
    },{
      $lookup:{
        from:"likes",
        localField:"_id",
        foreignField:"tweet",//one tweet has multiple likedBy
        as:"likeDetails", //it will store likeDetails:[{likedBy:user1, likedBy:user2...}]
        pipeline:[
          {
            $project:
            {
              "likedBy":1
            }
          }
        ]
      }
    },{
      $addFields:{
        likesCount: {
          $size: "$likeDetails"
        },
        ownerDetails:{
          $first:"$ownerDetails"   //$first will convert array to obejct
        },
        isLiked:{
          $cond:{
            $if:{$in:[ new mongoose.Types.ObjectId(req.user._id),// make it sure it is an object, if object then it will be ignored. Here you are using userId = user._id (the target user’s id whose tweets you are fetching).
                                                                // But isLiked should indicate whether the currently logged-in user (req.user._id) liked the tweet, not the target user.
              {
                 $map: {
                 input: "$likeDetails",  // array of objects
                 as: "l",                // each object in array
                 in: "$$l.likedBy"       // extract likedBy ObjectId
                }
              }
            ]}
          }
        }
        // $in checks if a value exists inside an array of values.
        // $in: [ value, arrayOfValues ]
        //but here  we are searching for "$subscribers.subscriber" which iswrong bcz subscribers has array of {likedBy:ObjectId}
        //and we are searching of objectId only. so it is an error. the array is not flattened.
        //so we flatted the array and the array will be [objectId1, ObjectId2,...] 
      }
    },{
      $sort:{
        createdAt: -1 //it will sort the tweets acc to newestone. createdAt: 1, means oldest one first
      }
    },{
      $project:{
        content:1,
        likesCount:1,
        ownerDetails:1, //it will show my username and my avatar in all array values
        isLiked:1,
        createdAt:1
      }
    }
  ])

  return res.status(200)
  .json(new apiResponse(200,usertweets[0],"all tweets successfully fetched")); 

});


export {
  createTweet,
  updateTweet,
  deleteTweet,
  getUserTweets
}

