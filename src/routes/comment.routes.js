import {Router} from "express";
import {
    getAllComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {upload} from "../middleware/multer.middleware.js"

const router=Router();
router.use(verifyJWT, upload.none()); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get(getAllComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;