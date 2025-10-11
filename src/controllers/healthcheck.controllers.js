import { apiResponse } from "../utils/apiresponse";
import { asyncHandler } from "../utils/asyncHandler";

const healthCheck=asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new apiResponse(200,{message: "Backend health is good"},"OK"))
})

export {healthCheck};