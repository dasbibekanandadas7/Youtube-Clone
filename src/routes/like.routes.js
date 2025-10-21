import { Router } from "express"
import {
   commentLikeToggle,
    videoLikeToggle,
    tweetLikeToggle,
    getAllLikedVideos
} from "../controllers/like.controllers.js"

import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router()
router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(videoLikeToggle)
router.route("/toggle/c/:commentId").post(commentLikeToggle)
router.route("/toggle/t/:tweetId").post(tweetLikeToggle)
router.route("/videos").get(getAllLikedVideos)


export default router;