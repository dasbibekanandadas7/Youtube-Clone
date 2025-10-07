import {Router} from "express";
import {loginUser,logoutUser,registerUser } from "../controllers/user.controllers.js";
import {upload} from "../middleware/multer.middleware.js"
import { verifyJWT } from "../middleware/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controllers.js";

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

router.route("/login").post(upload.fields([]),loginUser);

//secured routes. when the user is logged in 
router.route("/logout").post(upload.fields([]),verifyJWT, logoutUser);
router.route("/refresh-token").post(upload.fields([]),refreshAccessToken);


export default router;