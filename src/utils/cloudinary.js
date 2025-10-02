import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

 cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
 });

 const uploadOnCloudinary=async(localfilepath)=>{
    try {
        if(!localfilepath) return null;
        const response= await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        });
        //if file is uploaded succefully
        console.log("File is uploaded succesfully", response.url);
        return response;

    } catch (error) {
        // let our file is uploaded in the local storage but not uploaded into server. 
        //we have to erase the file from server. to remove malicious and unwanted file.
        fs.unlink(localfilepath); 
        return null;
    }
 }

 export {uploadOnCloudinary};