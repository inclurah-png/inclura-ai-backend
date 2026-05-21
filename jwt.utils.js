/* =========================================================
   INCLURA JWT UTILITIES
   Enterprise JWT Infrastructure
   ========================================================= */

const jwt = require("jsonwebtoken");

/* =========================================================
   GENERATE ACCESS TOKEN
========================================================= */

const generateAccessToken =
    (userId) => {

        return jwt.sign(

            {

                id: userId

            },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d"

            }

        );

    };

/* =========================================================
   GENERATE REFRESH TOKEN
========================================================= */

const generateRefreshToken =
    (userId) => {

        return jwt.sign(

            {

                id: userId

            },

            process.env.JWT_REFRESH_SECRET,

            {

                expiresIn: "30d"

            }

        );

    };

/* =========================================================
   VERIFY ACCESS TOKEN
========================================================= */

const verifyAccessToken =
    (token) => {

        try {

            return jwt.verify(

                token,

                process.env.JWT_SECRET

            );

        } catch (error) {

            throw new Error(

                "Invalid or expired access token."

            );

        }

    };

/* =========================================================
   VERIFY REFRESH TOKEN
========================================================= */

const verifyRefreshToken =
    (token) => {

        try {

            return jwt.verify(

                token,

                process.env.JWT_REFRESH_SECRET

            );

        } catch (error) {

            throw new Error(

                "Invalid or expired refresh token."

            );

        }

    };

/* =========================================================
   DECODE TOKEN
========================================================= */

const decodeToken =
    (token) => {

        try {

            return jwt.decode(token);

        } catch (error) {

            throw new Error(

                "Unable to decode token."

            );

        }

    };

/* =========================================================
   CHECK TOKEN EXPIRATION
========================================================= */

const isTokenExpired =
    (token) => {

        try {

            const decoded =
                jwt.decode(token);

            if (!decoded || !decoded.exp) {

                return true;

            }

            const currentTime =
                Date.now() / 1000;

            return decoded.exp <
                currentTime;

        } catch (error) {

            return true;

        }

    };

/* =========================================================
   GENERATE AUTH TOKENS
========================================================= */

const generateAuthTokens =
    (userId) => {

        return {

            accessToken:
                generateAccessToken(

                    userId

                ),

            refreshToken:
                generateRefreshToken(

                    userId

                )

        };

    };

/* =========================================================
   EXTRACT TOKEN FROM HEADER
========================================================= */

const extractTokenFromHeader =
    (authorizationHeader) => {

        if (

            !authorizationHeader ||

            !authorizationHeader.startsWith(
                "Bearer "
            )

        ) {

            throw new Error(

                "Authorization token missing."

            );

        }

        return authorizationHeader
            .split(" ")[1];

    };

/* =========================================================
   EXPORT UTILITIES
========================================================= */

module.exports = {

    generateAccessToken,

    generateRefreshToken,

    verifyAccessToken,

    verifyRefreshToken,

    decodeToken,

    isTokenExpired,

    generateAuthTokens,

    extractTokenFromHeader

};
