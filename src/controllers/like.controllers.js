import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apierror.js";
import { isValidObjectId } from "mongoose";
import {apiResponse} from "../utils/apiresponse.js";
import mongoose from "mongoose";
import {Like} from "../models/like.models.js";
import {Video} from "../models/video.models.js";
import {Tweet} from "../models/tweet.models.js"

const videolikeToggle=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;

    if(!isValidObjectId(videoId)){
        throw new apiError(401, "Invalid VideoId")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const videolikedAlready=await Like.findOne({ // if one is incorrect it will return null
        video: videoId,
        likedBy: req.user._id
    })
    
    if(videolikedAlready){
        await Like.findByIdAndDelete(likedAlready?._id)

        return res.status(200)
        .json(new apiResponse(200,{isLiked: false},"Video not liked successfully"))
    }

    const videoLikeCreate=await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })
    
    if(!videoLikeCreate){
        return new apiError(401, "Video Like failed")
    }
    return res.status(200)
        .json(new apiResponse(200,{isLiked: true},"Video liked successfully"))

})

const commentLikeToggle=asyncHandler(async(req,res)=>{
  const {commentId}=req.params;

  if(!isValidObjectId(commentId)){
    return new apiError(400,"Invalid CommentId")
  }

  const comment=await Comment.findById(commentId);
  if(!comment){
    return new apiError(400,"Invalid Comment")
  }

  const commentLikedAlready=await Like.findOne({
    comment:commentId,
    likedBy: req.user?._id
  })

  if(commentLikedAlready){
    await Like.findByIdAndDelete(commentLikedAlready?._id)

    return res.status(200)
    .json(new apiResponse(200,{isLiked: false}, "comment is not liked"))
  }

 const commentLikecreate=await Like.create({
    comment: commentId,
    likedBy:req.user?._id
 })
  
 if(!commentLikecreate){
    new apiError(401, "Comment like failed")
 }

 return res.status(200)
    .json(new apiResponse(200,{isLiked: true},"Comment liked successfully"))

})


const tweetLiketoggle=asyncHandler(async(req,res)=>{
    const {tweetId}=req.params;

    if(!isValidObjectId(tweetId)){
      return new apiError(401, "Invalid TweetID")
    }

    const tweet=await Tweet.findById(tweetId);
    if(!tweet){
        return new apiError(401, "Tweet is not found")
    }

    const tweetLikedAlready=await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(tweetLikedAlready){
        await Like.findByIdAndDelete(tweetId)

        return res.status(200)
        .json(200, {isLiked:false},"Tweet not liked successfully");
    }

    const tweetlikeCreate=await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(!tweetlikeCreate){
        return new apiError(401, "Tweet like failed")
    }

    return res.status(200)
    .json(200,{isLiked: true},"Tweet Liked successfully")

})

const getAllLikedVideos=asyncHandler(async(req,res)=>{
    const likeVideosAggregate= await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ]
            }
        },{
            $unwind:"$likedVideos"
        },{
            $sort:{
                createdAt: -1 // descending order, newest first
            }
        },{
            $project:{
                _id:0,
                likedVideos:{
                    _id: 1,
                    videofile:1,
                    thumbnail:1,
                    title:1,
                    description:1,
                    duration:1,
                    views:1,
                    isPublished:1,
                    ownerDetails:{
                        username:1,
                        fullname:1,
                        avatar:1
                    }
                }
            }
        }
    ])
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                likeVideosAggregate,
                "liked videos fetched successfully"
            )
        );
})

export {
    commentLikeToggle,
    videolikeToggle,
    tweetLiketoggle,
    getAllLikedVideos
}