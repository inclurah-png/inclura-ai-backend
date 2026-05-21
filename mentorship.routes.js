/* =========================================================
   INCLURA MENTORSHIP ROUTES
   Enterprise Mentorship Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    createMentorship,

    getAllMentorships,

    getSingleMentorship,

    updateMentorship,

    deleteMentorship,

    bookMentorship,

    cancelMentorship,

    completeMentorship,

    addMentorReview,

    getMentorReviews,

    getTrendingMentors,

    getExploreMentors,

    getCategoryMentors,

    getMentorProfile

} = require("../controllers/mentorship.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   MENTORSHIP ROUTES
========================================================= */

/* =========================================
   CREATE MENTORSHIP
========================================= */

router.post(

    "/create",

    authMiddleware,

    createMentorship

);

/* =========================================
   GET ALL MENTORSHIPS
========================================= */

router.get(

    "/",

    authMiddleware,

    getAllMentorships

);

/* =========================================
   GET SINGLE MENTORSHIP
========================================= */

router.get(

    "/:mentorshipId",

    authMiddleware,

    getSingleMentorship

);

/* =========================================
   UPDATE MENTORSHIP
========================================= */

router.put(

    "/:mentorshipId",

    authMiddleware,

    updateMentorship

);

/* =========================================
   DELETE MENTORSHIP
========================================= */

router.delete(

    "/:mentorshipId",

    authMiddleware,

    deleteMentorship

);

/* =========================================================
   BOOKING ROUTES
========================================================= */

/* =========================================
   BOOK MENTORSHIP
========================================= */

router.post(

    "/book/:mentorshipId",

    authMiddleware,

    bookMentorship

);

/* =========================================
   CANCEL MENTORSHIP
========================================= */

router.put(

    "/cancel/:mentorshipId",

    authMiddleware,

    cancelMentorship

);

/* =========================================
   COMPLETE MENTORSHIP
========================================= */

router.put(

    "/complete/:mentorshipId",

    authMiddleware,

    completeMentorship

);

/* =========================================================
   REVIEW ROUTES
========================================================= */

/* =========================================
   ADD MENTOR REVIEW
========================================= */

router.post(

    "/review/:mentorshipId",

    authMiddleware,

    addMentorReview

);

/* =========================================
   GET MENTOR REVIEWS
========================================= */

router.get(

    "/reviews/:mentorId",

    authMiddleware,

    getMentorReviews

);

/* =========================================================
   DISCOVERY ROUTES
========================================================= */

/* =========================================
   TRENDING MENTORS
========================================= */

router.get(

    "/feed/trending",

    authMiddleware,

    getTrendingMentors

);

/* =========================================
   EXPLORE MENTORS
========================================= */

router.get(

    "/feed/explore",

    authMiddleware,

    getExploreMentors

);

/* =========================================
   CATEGORY MENTORS
========================================= */

router.get(

    "/category/:categoryName",

    authMiddleware,

    getCategoryMentors

);

/* =========================================
   MENTOR PROFILE
========================================= */

router.get(

    "/mentor/:mentorId",

    authMiddleware,

    getMentorProfile

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

                voiceReadableProfiles: true,

                accessibleMentorshipResponses: true,

                screenReaderOptimized: true

            },

            message:

                "Mentorship accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
