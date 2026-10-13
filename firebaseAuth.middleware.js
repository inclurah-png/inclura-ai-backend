
/* =========================================================
   INCLURA FIREBASE AUTHENTICATION MIDDLEWARE
   Verifies Firebase ID tokens on the backend
   ========================================================= */

const { getFirebaseAuth } = require("./firebaseAdmin");

const firebaseAuthMiddleware = async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (
        typeof authorization !== "string" ||
        !authorization.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            success: false,
            accessibilityFriendly: true,
            message: "Please sign in to continue."
        });
    }

    const idToken = authorization.slice(7).trim();

    if (!idToken) {
        return res.status(401).json({
            success: false,
            accessibilityFriendly: true,
            message: "Your authentication token is missing."
        });
    }

    try {
        const decodedToken =
            await getFirebaseAuth().verifyIdToken(idToken);

        if (!decodedToken.uid) {
            return res.status(401).json({
                success: false,
                accessibilityFriendly: true,
                message: "Your authentication token is invalid."
            });
        }

        // Identity comes from Firebase's verified token,
        // never from a user ID supplied by the client.
        req.firebaseUser = {
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            emailVerified: decodedToken.email_verified === true
        };

        return next();
    } catch (error) {
        console.error(
            "Firebase authentication verification failed:",
            error.code || error.message
        );

        return res.status(401).json({
            success: false,
            accessibilityFriendly: true,
            message: "Your session is invalid or has expired. Please sign in again."
        });
    }
};

module.exports = firebaseAuthMiddleware;
