import { apiError } from "../utils/apierror";
import { apiResponse } from "../utils/apiresponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Subscription } from "../models/subscription.models.js";
import {Video} from "../models/video.models.js";
import mongoose from "mongoose";

const channelStats=asyncHandler(async (req, res) => {
    const userId=req.user?._id;
    if(!userId){
        throw new apiError(404, "Invalid user")
    }

    const subscribers=await Subscription.aggregate([
          {
            $match:{
                channel:new mongoose.Types.ObjectId(userId)
            }
          },{
             $group:{
                _id: null, // means add all documents together in one group. if _id:channel, it add all doc with channel togetherw ith 
                           //separate doc. like {id:1, subscriberCount:10}, {id:2, subscriberCount:5} etc...
                subscriberCount:{
                    $sum:1
                }
             }
          }
        ])

    const videos=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },{
            $project:{
                totalLikes:{
                    $size:"$likes"
                },
                totalViews:"$views",
                totalVideos: 1 //include this field in the output as-is. documents don’t have a totalVideos field yet. 
                // This is often used as a placeholder for counting documents in a later stage ($group)
                // for each doc the totalVideos will be 1 in the array of documents. when in group it search for totalVideos
                //and sum it up. similarly totalLikes and totalViews
            }
        },
        {
            $group:{
                _id: null,
                totalLikes:{
                    $sum:"$totalLikes"
                },
                totalViews:{
                    $sum:"$totalViews"
                },
                totalVideos:{
                    $sum: 1    //$sum normally adds up numeric values from documents
                              //totalVideos: { $sum: "$totalVideos" }... we can write this also

                }
            }
            //after group the project stage is gone and a new doc is created with data from group stage.
            //if we want to keep some fields from project stage we need to add them in group stage
            // $first → keeps the first value of that field in the group
            // $last → keeps the last value
            // $push → collects all values into an array
        }
    ]) 
    
    const stats={
         totalSubscribers: subscribers[0]?.subscriberCount || 0,
         totalLikes: videos[0]?.totalLikes || 0,
         totalViews: videos[0]?.totalViews || 0,
         totalVideos: videos[0]?.totalVideos || 0,
    }

    return res.status(200).json(new apiResponse(200, stats, "Channel stats fetched successfully"));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const userId = req.user?._id;

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" }
                    //MongoDB date aggregation operator.Converts a Date object into its component parts: 
                    // year, month, day, hour, minute, second, millisecond, and timezone offset
                },
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1
                },
                isPublished: 1,
                likesCount: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            videos,
            "channel stats fetched successfully"
        )
    );
});

export {
    channelStats,
    getChannelVideos
}