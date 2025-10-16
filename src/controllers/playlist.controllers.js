import { Playlist} from "../models/playlist.models";
import { asyncHandler } from "../utils/asyncHandler";
import { apiError } from "../utils/apierror";
import { apiResponse } from "../utils/apiresponse";
import mongoose, { isValidObjectId } from "mongoose";
import {Video} from "../models/video.models"
import {User} from "../models/user.models"


const createPlaylist=asyncHandler(async(req, res)=>{
    const{name, description}=req.body;
    if(!name || !description){
        throw new apiResponse(401, "Name and Description required")
    }

    const playlist=await Playlist.create({
        name: name,
        description: description,
        owner: req.user?._id
    })
    if(!playlist){
        throw new apiError(401, "Playlist Could not created")
    }

    return res
        .status(200)
        .json(new apiResponse(200, playlist, "playlist created successfully"));
})

const updatePlaylist=asyncHandler(async(req,res)=>{
    const {newname, newdescription}=req.body;
    const{playlistId}=req.params;

    if(!newname || !newdescription){
        throw new apiError("401", "new name and description is required")
    }

    if(!isValidObjectId(playlistId)){
        throw new apiError(401, "Invalid playlistId")
    }

    const playlist=await Playlist.findById(playlistId);
    if(!playlist){
        throw new apiError(401, "Playlist doesn't exist")
    }

    if(playlist?.owner.toString()!==req.user?._id.toString()){
        throw new apiError(401, "Owner is allowed to update")
    }

    const updatedPlaylist=await Playlist.findByIdAndUpdate(
        playlist?._id,{
            $set:{
                name: newname,
                description: newdescription
            }
        },{
            new: true
        }
    )

    return res
        .status(200)
        .json(new apiResponse(200,updatedPlaylist,"playlist updated successfully"));
})

const deletePlaylist=asyncHandler(async(req, res)=>{
    const{playlistId}=req.params;
    if(!isValidObjectId(playlistId)){
        throw new apiError(401, "Invalid playlistId")
    }

    const playlist=await Playlist.findById(playlistId);
    if(!playlist){
        throw new apiError(401, "Playlist doesn't exist")
    }

    if(playlist?.owner.toString()!==req.user?._id.toString()){
        throw new apiError(401, "Owner is allowed to update")
    }

    const deletedPlaylist=await Playlist.findByIdAndDelete(playlist?._id);
    if(!deletedPlaylist){
        throw new apiError(401, "Couldn't delete playlist")
    }

    return res
        .status(200)
        .json(new apiResponse(200,{},"playlist updated successfully"))
})

const addVideoToPlaylist=asyncHandler(async(req, res)=>{
    const {videoId, playlistId}=req.params;
    if(!isValidObjectId(videoId) || !isValidObjectId(playlistId)){
        throw new apiError(401, "Invalid videoId or playlistId")
    }

    const playlist=await Playlist.findById(playlistId);
    if(!playlist){
        throw new apiError(401, "Invalid playlist")
    }

    const video=await Video.findById(videoId)
    if(!videoId){
        throw new apiError(401, "Invalid Video")
    }

    if(!video.owner.toString() && !playlist.owner.toString()!==req.user?._id){
        throw new apiError(400, "only owner can add video to thier playlist");
    }

   const updatedPlaylist=await Playlist.findByIdAndUpdate(
    playlist?._id,{
        $set:{
            videos: videoId
        }
    },{
        new: true
    }
   )

   if(!updatedPlaylist){
        throw new apiError(400, "Couldn't add video in the Playlist")
   }

   return res.status(200)
   .json(200,updatedPlaylist,"Video added successfully")

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid PlaylistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }
    if (!video) {
        throw new apiError(404, "video not found");
    }

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new apiError(
            404,
            "only owner can remove video from thier playlist"
        );
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                video: videoId,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                updatedPlaylist,
                "Removed video from playlist successfully"
            )
        );
})

const getPlaylistById=asyncHandler(async(req,res)=>{
    const {playlistId}=req.params;
    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }

    const allPlaylist= await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"videos", // here mongoose is checking the single doc with array of documents. It internally compares.
                                     //It checks ANY matching element, not all.
                foreignField:"_id",
                as:"videos"
            }
        },{
            $match:{
                "videos.isPublished": true //Check if any object inside the videos[] array has isPublished: true
                // it doesnt check the video collections, it does check the Playlist collection where videos array has the data of
                //all the video, not just only ID.
            }
        },{
            $lookup:{
                 from: "users",
                 localField: "owner",
                 foreignField: "_id",
                 as: "owner",
            }
        },{
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first:"$owner" //It does not filter, sort, or choose based on content — it just takes the element at index 0.
                }
            }
        },{
            $project:{
                name:1,
                description:1,
                createdAt:1,
                updatedAt:1,
                totalVideos:1,
                totalViews:1,
                vidoes:{
                    _id:1,
                    videoFile:1,
                    thumbnail:1,
                    title:1,
                    description:1,
                    duration:1,
                    createdAt:1,
                    views:1
                },
                owner:{
                    username:1,
                    fullname:1,
                    avatar:1
                }
            }
        }
    ])
    return res
        .status(200)
        .json(new apiResponse(200, allPlaylist[0], "playlist fetched successfully"));

})

const getUserAllPlaylists=asyncHandler(async(req,res)=>{
    const {userId}=req.params

     if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid userId");
    }

    const user=await User.findById(userId)
    if(!user){
        throw new apiError(400, "Invalid user");
    }
    const playlistvideos=await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"owner",
                foreignField:"owner",
                as:"vidoes"
            }
        },{
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"videos.views"
                }
            }
        },{
             $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ])
    return res
    .status(200)
    .json(new apiResponse(200, playlistvideos, "User playlists fetched successfully"));
})

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeVideoFromPlaylist,
    addVideoToPlaylist,
    getPlaylistById,
    getUserAllPlaylists
}