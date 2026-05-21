/* =========================================================
   INCLURA POST ROUTES
   Enterprise Social Post Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    createPost,

    getAllPosts,

    getSinglePost,

    updatePost,

    deletePost,

    likePost,

    unlikePost,

    commentOnPost,

    deleteComment,

    sharePost,

    savePost,

    unsavePost,

    getTrendingPosts,

    getExploreFeed,

    getFollowingFeed,

    getUserPosts

} = require("../controllers/post.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   POST ROUTES
========================================================= */

/* =========================================
   CREATE POST
========================================= */

router.post(

    "/create",

    authMiddleware,

    createPost

);

/* =========================================
   GET ALL POSTS
========================================= */

router.get(

    "/",

    authMiddleware,

    getAllPosts

);

/* =========================================
   GET SINGLE POST
========================================= */

router.get(

    "/:postId",

    authMiddleware,

    getSinglePost

);

/* =========================================
   UPDATE POST
========================================= */

router.put(

    "/:postId",

    authMiddleware,

    updatePost

);

/* =========================================
   DELETE POST
========================================= */

router.delete(

    "/:postId",

    authMiddleware,

    deletePost

);

/* =========================================================
   ENGAGEMENT ROUTES
========================================================= */

/* =========================================
   LIKE POST
========================================= */

router.put(

    "/like/:postId",

    authMiddleware,

    likePost

);

/* =========================================
   UNLIKE POST
========================================= */

router.put(

    "/unlike/:postId",

    authMiddleware,

    unlikePost

);

/* =========================================
   COMMENT ON POST
========================================= */

router.post(

    "/comment/:postId",

    authMiddleware,

    commentOnPost

);

/* =========================================
   DELETE COMMENT
========================================= */

router.delete(

    "/comment/:postId/:commentId",

    authMiddleware,

    deleteComment

);

/* =========================================
   SHARE POST
========================================= */

router.post(

    "/share/:postId",

    authMiddleware,

    sharePost

);

/* =========================================
   SAVE POST
========================================= */

router.put(

    "/save/:postId",

    authMiddleware,

    savePost

);

/* =========================================
   UNSAVE POST
========================================= */

router.put(

    "/unsave/:postId",

    authMiddleware,

    unsavePost

);

/* =========================================================
   FEED ROUTES
========================================================= */

/* =========================================
   TRENDING FEED
========================================= */

router.get(

    "/feed/trending",

    authMiddleware,

    getTrendingPosts

);

/* =========================================
   EXPLORE FEED
========================================= */

router.get(

    "/feed/explore",

    authMiddleware,

    getExploreFeed

);

/* =========================================
   FOLLOWING FEED
========================================= */

router.get(

    "/feed/following",

    authMiddleware,

    getFollowingFeed

);

/* =========================================
   USER POSTS
========================================= */

router.get(

    "/user/:userId",

    authMiddleware,

    getUserPosts

);

/* =========================================================
   ACCESSIBILITY STATUS ROUTE
========================================================= */

router.get(

    "/accessibility/status",

    async (req, res) => {

        return res.status(200).json({

            success: true,

            accessibility: {

                voiceReadablePosts: true,

                screenReaderOptimized: true,

                accessibleFeeds: true

            },

            message:

                "Post accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
