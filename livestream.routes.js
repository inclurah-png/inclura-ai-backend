/* =========================================================
   INCLURA LIVESTREAM ROUTES
   Enterprise Realtime Streaming Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    createLivestream,

    getAllLivestreams,

    getSingleLivestream,

    updateLivestream,

    deleteLivestream,

    endLivestream,

    joinLivestream,

    leaveLivestream,

    commentOnLivestream,

    reactToLivestream,

    shareLivestream,

    getTrendingLivestreams,

    getExploreLivestreams,

    getCreatorLivestreams

} = require("../controllers/livestream.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   LIVESTREAM ROUTES
========================================================= */

/* =========================================
   CREATE LIVESTREAM
========================================= */

router.post(

    "/create",

    authMiddleware,

    createLivestream

);

/* =========================================
   GET ALL LIVESTREAMS
========================================= */

router.get(

    "/",

    authMiddleware,

    getAllLivestreams

);

/* =========================================
   GET SINGLE LIVESTREAM
========================================= */

router.get(

    "/:livestreamId",

    authMiddleware,

    getSingleLivestream

);

/* =========================================
   UPDATE LIVESTREAM
========================================= */

router.put(

    "/:livestreamId",

    authMiddleware,

    updateLivestream

);

/* =========================================
   DELETE LIVESTREAM
========================================= */

router.delete(

    "/:livestreamId",

    authMiddleware,

    deleteLivestream

);

/* =========================================
   END LIVESTREAM
========================================= */

router.put(

    "/end/:livestreamId",

    authMiddleware,

    endLivestream

);

/* =========================================================
   LIVESTREAM ENGAGEMENT
========================================================= */

/* =========================================
   JOIN LIVESTREAM
========================================= */

router.post(

    "/join/:livestreamId",

    authMiddleware,

    joinLivestream

);

/* =========================================
   LEAVE LIVESTREAM
========================================= */

router.post(

    "/leave/:livestreamId",

    authMiddleware,

    leaveLivestream

);

/* =========================================
   COMMENT ON LIVESTREAM
========================================= */

router.post(

    "/comment/:livestreamId",

    authMiddleware,

    commentOnLivestream

);

/* =========================================
   REACT TO LIVESTREAM
========================================= */

router.post(

    "/react/:livestreamId",

    authMiddleware,

    reactToLivestream

);

/* =========================================
   SHARE LIVESTREAM
========================================= */

router.post(

    "/share/:livestreamId",

    authMiddleware,

    shareLivestream

);

/* =========================================================
   DISCOVERY ROUTES
========================================================= */

/* =========================================
   TRENDING LIVESTREAMS
========================================= */

router.get(

    "/feed/trending",

    authMiddleware,

    getTrendingLivestreams

);

/* =========================================
   EXPLORE LIVESTREAMS
========================================= */

router.get(

    "/feed/explore",

    authMiddleware,

    getExploreLivestreams

);

/* =========================================
   CREATOR LIVESTREAMS
========================================= */

router.get(

    "/creator/:creatorId",

    authMiddleware,

    getCreatorLivestreams

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

                captionsSupport: true,

                voiceReadableResponses: true,

                screenReaderOptimizedMetadata: true

            },

            message:

                "Livestream accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
