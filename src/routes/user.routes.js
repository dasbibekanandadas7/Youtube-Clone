import {Router} from "express";
import {loginUser,logoutUser,registerUser,changeCurrentPassword,updateAccountDetails,getCurrentUser,
       updateUserAvatar,updateUserCoverImage,getUserChannelProfile, getWatchHistory} from "../controllers/user.controllers.js";
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
router.route("/change-password").post(upload.fields([]),verifyJWT,changeCurrentPassword);
router.route("/update-account").patch(upload.fields([]),verifyJWT,updateAccountDetails);
router.route("/current-user").get(upload.fields([]),verifyJWT,getCurrentUser);
router.route("/update-avatar").post(verifyJWT, upload.single("avatar"),updateUserAvatar);
router.route("/update-coverimage").post(verifyJWT, upload.single("coverimage"),updateUserCoverImage);
router.route("/c/getUserProfile").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);






export default router;