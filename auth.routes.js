/* =========================================================
   INCLURA AUTH ROUTES
   Enterprise Authentication Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    registerUser,

    loginUser,

    logoutUser,

    forgotPassword,

    resetPassword,

    refreshAccessToken,

    verifyEmail,

    resendVerificationEmail,

    getAuthenticatedUser,

    updatePassword

} = require("../controllers/auth.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   AUTH ROUTES
========================================================= */

/* =========================================
   REGISTER
========================================= */

router.post(

    "/register",

    registerUser

);

/* =========================================
   LOGIN
========================================= */

router.post(

    "/login",

    loginUser

);

/* =========================================
   LOGOUT
========================================= */

router.post(

    "/logout",

    authMiddleware,

    logoutUser

);

/* =========================================
   FORGOT PASSWORD
========================================= */

router.post(

    "/forgot-password",

    forgotPassword

);

/* =========================================
   RESET PASSWORD
========================================= */

router.post(

    "/reset-password/:token",

    resetPassword

);

/* =========================================
   REFRESH ACCESS TOKEN
========================================= */

router.post(

    "/refresh-token",

    refreshAccessToken

);

/* =========================================
   VERIFY EMAIL
========================================= */

router.get(

    "/verify-email/:token",

    verifyEmail

);

/* =========================================
   RESEND VERIFICATION EMAIL
========================================= */

router.post(

    "/resend-verification-email",

    resendVerificationEmail

);

/* =========================================
   GET AUTHENTICATED USER
========================================= */

router.get(

    "/me",

    authMiddleware,

    getAuthenticatedUser

);

/* =========================================
   UPDATE PASSWORD
========================================= */

router.put(

    "/update-password",

    authMiddleware,

    updatePassword

);

/* =========================================================
   ACCESSIBILITY HEALTH ROUTE
========================================================= */

router.get(

    "/accessibility-status",

    async (req, res) => {

        return res.status(200).json({

            success: true,

            accessibility: {

                voiceReadableErrors: true,

                screenReaderOptimized: true,

                accessibleAuthenticationFlow: true

            },

            message:

                "Accessibility authentication services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
