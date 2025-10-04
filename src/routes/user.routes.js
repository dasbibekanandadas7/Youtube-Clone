import {Router} from "express";
import { registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middleware/multer.middleware.js"

const router=Router();

//as in controllers can only read data coming from frontend but not files, here we use the middleware to get the files(images)
//from frontend, it says before going to controller for the userdata, run the middleware to upload the files in the cloudinary, 
//then POST the url in DB. like we do for data in case of controller.

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name: "coverimage",
            maxCount: 1
        }
    ]),
    registerUser);

export default router;