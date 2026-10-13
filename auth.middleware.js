
/* =========================================================
   INCLURA AUTHENTICATION MIDDLEWARE
   JWT Access Token Verification
   ========================================================= */

const {
    verifyAccessToken,
    extractTokenFromHeader
} = require("./jwt.utils");

/* =========================================================
   AUTHENTICATE REQUEST
========================================================= */

const authMiddleware = (req, res, next) => {
    try {
        const token = extractTokenFromHeader(
            req.headers.authorization
        );

        const decoded = verifyAccessToken(token);

        if (
            !decoded ||
            typeof decoded.id !== "string" ||
            !decoded.id.trim()
        ) {
            return res.status(401).json({
                success: false,
                accessible: true,
                message: "Invalid authentication token."
            });
        }

        // Use the identity verified from the signed JWT.
        // Never trust a user ID supplied in the request body.
        req.user = {
            id: decoded.id
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            accessible: true,
            message:
                "Authentication required. Please sign in again."
        });
    }
};

/* =========================================================
   EXPORT MIDDLEWARE
========================================================= */

module.exports = authMiddleware;
