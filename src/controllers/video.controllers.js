import mongoose, { isValidObjectId } from 'mongoose';
import {Video} from '../models/video.models.js';
import { asyncHandler } from "../utils/asyncHandler";
import { apiError } from "../utils/apierror";
import { apiResponse } from "../utils/apiresponse";
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const updateVideo=asyncHandler(async(req,res)=>{
    const{videoId}=req.params
    const {title, description}=req.body

    if(!isValidObjectId(videoId)){
        throw new apiError(401, "Invalid VideoID")
    }
    const video=await Video.findById(videoId);
    if(!video){
         throw new apiError(401, "Invalid Video")
    }

    if(!title || !description){
         throw new apiError(401, "Provide data to update")
    }

     if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400,"You can't edit this video as you are not the owner");
    }

    const thumbnailDelete=video.thumbnail.public_id;
    const thumbnailLocalPath=req.files.path

    if (!thumbnailLocalPath) {
        throw new apiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
        throw new apiError(400, "thumbnail not found");
    }



    const updatedVideo=await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title: title,
                description:description,
                thumbnail:{
                    url: thumbnail.url,
                    public_id:thumbnail.public_id
                }
            }
        },
        {
            new: true
        }
    )

    if (!updatedVideo) {
        throw new apiError(500, "Failed to update video please try again");
    }

    //delete thumbnail from cloudinary
    if(updateVideo){
        await deleteOnCloudinary(thumbnailDelete)
    }


    return res
        .status(200)
        .json(new apiResponse(200, updatedVideo, "Video updated successfully"))


})

const deleteVideo=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new apiError(401, "Invalid VideoID")
    }

    const video=await Video.findById(videoId);
    if(!video){
        throw new apiError(401, "Invalid Video")
    }

    if(video?.owner.toString()!==req.user?._id){
        throw new apiError(401, "Only owner can Delete")
    }

    const deletedVideo=await Video.findByIdAndDelete(videoId);
    if(!deletedVideo){
        throw new apiError(401, "Couldn't delete Video")
    }

    //delete from cloudnary remained
    const deleteThumbnail=await deleteOnCloudinary(video.thumbnail.public_id);
    const deleteVideo=await deleteOnCloudinary(video.videofile.public_id);

    if(!deleteThumbnail){
        throw new apiError(500, "Thumbnail could not deleted")
    }
    if(!deleteVideo){
        throw new apiError(500, "Video could not deleted")
    }

    // delete all likes on video
    await Like.deleteMany({
        video: videoId
    })

    // delete all comment on video
    await Comment.deleteMany({
        video:videoId
    })

    return res.status(200).
    json(200,{},"Delete Successful")

})

//get a video, upload to cloudinary, create video
const publishVideo=asyncHandler(async(req,res)=>{
     const {title, description}=req.body;

     if ([title, description].some((field) => field?.trim() === "")) { // if any of the value in the array is "", " ", undefinded or null
                                                                    // it will be true
        throw new apiError(400, "All fields are required");
    }

    const videoFilelocalPath=req.files?.videofile[0].path  //req.files -> Object that Multer creates to store uploaded files.
                                                 //videofile is the name of the array of uploaded files
    const thumbnailFilelocalPath=req.files?.thumbnail[0].path

    if(!videoFilelocalPath){
        throw new apiError(500, "Video file is required")
    }

    if(!thumbnailFilelocalPath){
        throw new apiError(500, "Thumbnail file is required")
    }

    const videoFile=await uploadOnCloudinary(videoFilelocalPath);
    const thumbnailFile=await uploadOnCloudinary(thumbnailFilelocalPath);

    if (!videoFile) {
        throw new apiError(400, "Video could not uploaded");
    }

    if (!thumbnailFile) {
        throw new apiError(400, "Thumbnail could not uploaded");
    }

    const video=await Video.create({
        title: title,
        description:description,
        duration: videoFile.duration,
        videofile:{
            url: videoFile.url,
            public_id:videoFile.public_id 
        },
        thumbnail:{
            url: thumbnailFile.url,
            public_id:thumbnailFile.public_id
        },
        owner: req.user?._id,
        isPublished: false
    })

    const videoUploaded=await Video.findById(video?._id)
    if(videoUploaded){
      throw new apiError(500, "videoUpload failed please try again !!!")
    }

     return res
        .status(200)
        .json(new apiResponse(200, video, "Video uploaded successfully"));

})

// get all videos based on query, sort, pagination
const getAllVideos=asyncHandler(async(req,res)=>{
    const {page=1, query, sortBy, sortType,userId}=req.query;
    const limit=10

    const pipeline=[];

    if(query){
        pipeline.push({
            $search:{
                index: "search-videos",
                text:{
                    query: query,
                    path:["title", "description"]
                }
            }
        })
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new apiError(401, "Invalid userID")
        }

        pipeline.push({
            $match:{owner: new mongoose.Types.ObjectId(userId)}
        })
    }

    //show the videos whose isPublished is true
    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)

    if(sortBy && sortType){
       pipeline.push({
        $sort:{
            [sortBy]:sortType==="desc"?-1:1
        }
       })
    }

    else{
        pipeline.push({
            $sort:{
                createdAt:-1
            }
        })
    }

    pipeline.push({
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        username:1,
                        "avatar.url":1
                    }
                }
            ]
        }
    },{
        $unwind:"$ownerDetails"
    })


    const videoAggregate=Video.aggregate(pipeline)

    const options={
        page:parseInt(page, 10),
        limit:parseInt(limit, 10)
    }

    const video=await Video.aggregatePaginate(videoAggregate, options)

    return res.status(200)
    .json(new apiResponse(200,video, "All video fetched Successfully"))

})

const getVideoById=asyncHandler(async(req,res)=>{
    const {videoId}=req.params
    if(!isValidObjectId(videoId)){
       throw new apiError(400, "Invalid videoID")
    }

    if(!isValidObjectId(req.user?._id)){
         throw new apiError(400, "Invalid userID")
    }

    const video=await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },{
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers",
                        }
                    },{
                        $addFields:{
                            subscriberCount:{
                                $size: "$subscribers"
                            },
                            isSubscribed:{
                                 $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },{
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },{
            $project:{
                 $addFields: {
                    likesCount: {
                       $size: "$likes"
                    },
                    owner: {
                       $first: "$owner"
                    },
                    isLiked: {
                       $cond: {
                          if: {$in: [req.user?._id, "$likes.likedBy"]},
                          then: true,
                          else: false
                        }
                    }
                 }
            }
        },{
            
            $project: {
                "videofile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])

    if (!video) {
        throw new apiError(500, "failed to fetch video");
    }
    
    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc:{
                views:1
            }
        }
    )


    // add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: { //Adds a value to an array field only if it does not already exist in the array.prevents duplicate entries
       //If the user watches a video multiple times, you don’t want to store the same video ID multiple times. 
       // $addToSet ensures each video ID appears at most once. $set replaces the value of a field completely rather than just add a value
            watchHistory: videoId
        }
    });

     return res
        .status(200)
        .json(
            new apiResponse(200, video[0], "video details fetched successfully")
        );

})


const togglePublishStatus=asyncHandler(async(req,res)=>{
    const{videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new apiError(401, "Invalid VideoID")
    }

    const video=await Video.findById(videoId);
    if(!video){
        throw new apiError(401, "Invalid Video")
    }

    if(video.owner?.toString()!==req.user?._id){
        throw new apiError(400, "Only owner can Toggle")
    }


    const updatedToggle=await Video.findByIdAndUpdate(
        videoId,
        {
           $set:{
            isPublished:!isPublished
           }
        },{
            new: true
        }
    )

    if(!updatedToggle){
        throw new apiError(401, "Toggle Unsuccessful")
    }

    return res.status(200)
    .json(200,{Published: isPublished},"Toggle successful")
})

export {
    updateVideo,
    deleteVideo,
    publishVideo,
    getAllVideos,
    getVideoById,
    togglePublishStatus
}