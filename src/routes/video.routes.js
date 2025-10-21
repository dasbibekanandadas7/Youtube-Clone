import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {upload} from "../middleware/multer.middleware.js"

import {
    updateVideo,
    deleteVideo,
    publishVideo,
    getAllVideos,
    getVideoById,
    togglePublishStatus
} from "../controllers/video.controllers.js"

const router = Router();
router.use(verifyJWT);

router.route("/")
.get(getAllVideos)
.post(upload.fields([
    {
      name: "videofile",
      maxCount:1
    },{
      name: "thumbnail",
      maxCount:1
    }
]),
publishVideo
)

router.route("/v/:videoId")
.get(getVideoById)
.patch(upload.single("thumbnail"),updateVideo)
.delete(deleteVideo)

router.route("/toggle/publish/:videoId").patch(togglePublishStatus)

export default router;
