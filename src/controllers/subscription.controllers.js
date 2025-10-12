import {Subscription} from "../models/subscription.models.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apierror.js";
import { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import {apiResponse} from "../utils/apiresponse.js";
import mongoose from "mongoose";


const toggleSubscription=asyncHandler(async(req,res)=>{
    const {channelId}=req.params; //channel is id the _id of the user stored in DB. no security risk as exposed bcz 
                                //all api is protected in verifyJWT
    
    if(!isValidObjectId(channelId)){
          throw new apiError(400, "Invalid channelId");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
          throw new apiError(404, "Channel not found");
    }

    const isSubscribed=await Subscription.findOne({
        subscriber:req.user._id,
        channel:channelId
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res.status(200)
        .json(new apiResponse(200,{subscribed:false},"Unsubscribed"));
    }

    const newSubscription= await Subscription.create({
        subscriber:req.user._id, //ObjectId
        channel:channelId //string → Mongoose casts to ObjectId
    })

    if(!newSubscription){
        throw new apiError(401, "Could not subscribe");
    }

    return res.status(200)
    .json(new apiResponse(200,{subscribed:true},"Subscribed"));

})


const getUserChannelSubscriber=asyncHandler(async(req,res)=>{
    const{channelId}=req.params;

    if(!isValidObjectId(channelId)){
          throw new apiError(400, "Invalid channelId");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
          throw new apiError(404, "Channel not found");
    }

    const subscribers=await Subscription.aggregate([
       {
        $match:{
            channel: new mongoose.Types.ObjectId(channelId)
        }
       },
       {
        $lookup:{
            from:"users",
            localField:"subscriber",
            foreignField:"_id",
            as:"subscribers",
            pipeline:[
                {
                    $lookup:{
                         from:"subscriptions",
                         localField:"_id",
                         foreignField:"channel",
                         as:"subscribedToSubscriber",
                    }
                },{
                    $addFields:{
                        subscriberscountofsubscriber:{
                            $size:"$subscribedToSubscriber"
                        },
                        issubcribedTosubscriber:{
                            $cond:{
                                if:{
                                   $in:[
                                    new mongoose.Types.ObjectId(channelId), //channel id is my id check if i have subscribed to the the subscriber or not
                                   {
                                        $map: {
                                            input: "$subscribedToSubscriber", // array of subscription objects
                                            as: "s",
                                            in: "$$s.subscriber"              // extract subscriber ObjectId
                                        }
                                        }
                                   ]
                                },
                                then:true,
                                else:false
                            }
                        },
                        
                    }
                }
            ]
        }
       },{
        $unwind: "$subscribers"
       },{
        $project:{
// In MongoDB aggregation, _id is included by default in every document.
// If you don’t specify _id in $project at all, it still appears in the output.
// The only way to remove it is to explicitly set _id: 0
            _id: 0,
            subscriber:{
              _id: 1,
              username: 1,
              fullname:1,
              subscriberscountofsubscriber:1,
              issubcribedTosubscriber:1
            }
        }
       },{
          $group: {
          _id: null,                       // group all documents together
          totalSubscribers: { $sum: 1 },   // counts one per subscription = total subscribers
          subscribersList: { $push: "$subscriber" } // keep your subscriber info
          }
        }
// $group creates new documents based on the _id you specify.
// Any fields you define inside $group (like totalSubscribers or subscribersList) become top-level fields in the grouped output.
// The previous structure of the document is replaced by the $group result
    ])

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                subscribers,
                "subscribers fetched successfully"
            )
        );

}) 

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params; //my Id

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribedChannel",
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    "avatar.url": 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1
                    },
                },
            },
        },{
            // Group everything together to get total channels
            $group: {
                _id: null,
                totalSubscribedChannels: { $sum: 1 },
                channels: { $push: "$subscribedChannel" },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        );
})



export {
    toggleSubscription,
    getUserChannelSubscriber,
    getSubscribedChannels
}