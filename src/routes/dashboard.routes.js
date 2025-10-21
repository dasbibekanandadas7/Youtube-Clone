import { Router } from "express"
import{
   channelStats,
    getChannelVideos
} from "../controllers/dashboard.controllers.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router=Router()

router.use(verifyJWT)
router.route("/stats").get(channelStats)
router.route("/videos").get(getChannelVideos)

export default router;