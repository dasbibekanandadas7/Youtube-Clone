import mongoose, { isValidObjectId } from "mongoose";
import {Comment} from "../models/comment.models"
import { apiError } from "../utils/apierror";
import { apiResponse } from "../utils/apiresponse";
import { Video } from "../models/video.models";
import { Like } from "../models/like.models";
import { asyncHandler } from "../utils/asyncHandler";

const getAllComments=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const {page=1, limit=10}=req.query;

    if(!isValidObjectId(videoId)){
        return new apiError(400, "Invalid videoID");
    }

    const video= await Video.findById(videoId);

    if(!video){
        return new apiError(400, "No video available");
    }

    const videoComments=await Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },{
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
            },
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likesoncomment",
            }
        },{
            $addFields:{
                likesCount:{
                    $size:"$likesoncomment"
                },
                owner:{
                   $first:"$owner"
                }, //It unwraps the array into a single object by picking the first item.
                // It unwraps the single-element array for each comment, so owner becomes a single object per comment.
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id, "likesoncomment.likedBy"]
                        }
                    }
                }
            }
        },{
            $sort:{
                createdAt: -1
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:{
                    username:1,
                    fullname:1,
                    "avatar.url":1
                },
                isLiked:1
            }
        }
    ])

    const options={
        page:parseInt(page,10),
        limit:parent(limit,10)
    }
    //If you only use limit = 5 without page, MongoDB will always return the first 5 items of your query/aggregation.
    // limit → controls how many items per page
    // page → controls which “batch” of items to fetch
    // skip = (page - 1) * limit
    // Example:
    // page = 1, limit = 5 → skip (1-1)*5 = 0, return items 1–5
    // page = 2, limit = 5 → skip (2-1)*5 = 5, return items 6–10


    // aggregatePaginate is useful when you want to paginate results of an aggregation pipeline in MongoDB
    //Lookups / joins ($lookup),Computed fields ($addFields),Filtering with $match, Sorting with $sort, Grouping / aggregation ($group)

    const comments=await Comment.aggregatePaginate(
        videoComments,
        options
    )
  
     return res
        .status(200)
        .json(new apiResponse(200, comments, "Comments fetched successfully"));
    
})

const addComment=asyncHandler(async(req,res)=>{
    const{videoId}=req.params;
    const{content}=req.body;

    if(!isValidObjectId(videoId)){
        return new apiError(401, "Invalid VideoId")
    }
    const video= await Video.findById(videoId);
    if(!video){
        return new apiError(401, "Invalid Video")
    }

    const comment=await Comment.create({
        content:content,
        video:videoId,
        owner: req.user?._id
    })

    if(!comment){
         throw new apiError(500, "Failed to add comment please try again");
    }

    return res
        .status(201)
        .json(new apiResponse(201, comment, "Comment added successfully"));    
})

const updateComment=asyncHandler(async(req,res)=>{
    const {commentId}=req.params;
    const {newcontent}=req.body;

    if(!isValidObjectId(commentId)){
        return new apiError(401, "Invalid CommentId")
    }
     const comment= await Video.findById(commentId);
    if(!comment){
        return new apiError(401, "Invalid comment")
    }

    if(!comment?.owner.equals(req.user?._id)){   //or comment?.owner.toString() !== req.user?._id.toString()
         //  ObjectIds, you cannot compare them with !== or === directly in JavaScript, because they are objects, not strings
     return new apiError(401, "only comment owner can edit their comment")
    }

    const updateComment= await Comment.findByIdAndUpdate(commentId,
        {
            $set:{
                content: content
            }
        },
        {
            new: true
        }
    )
    if(!updateComment){
        return new apiError(401, "Comment could not updated")
    }

     return res
        .status(200)
        .json(
            new apiResponse(200, updatedComment, "Comment edited successfully")
        );
    
})

const deleteComment=asyncHandler(async(req,res)=>{
     const { commentId } = req.params;
     if(!isValidObjectId(commentId)){
        throw new apiError(404, "Invalid comment ID");
     }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "only comment owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    });
    //in Like collection there are multiple (comment, likedBy) document which need to be deleted for consistency 

    return res
        .status(200)
        .json(
            new apiResponse(200, { commentId }, "Comment deleted successfully")
        );
})

export {
    getAllComments,
    addComment,
    updateComment,
    deleteComment   
}