import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import{
    toggleSubscription,
    getUserChannelSubscriber,
    getSubscribedChannels
} from "../controllers/subscription.controllers.js"

const router=Router()
router.use(verifyJWT)

router.route("/c/:channelId")
.get(getUserChannelSubscriber)
.post(toggleSubscription)

router.route("/u/:subscriberId").get(getSubscribedChannels)

export default router