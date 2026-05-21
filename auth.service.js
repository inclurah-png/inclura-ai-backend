/* =========================================================
   INCLURA AUTH SERVICE
   Enterprise Authentication Business Logic
   ========================================================= */

const bcrypt = require("bcryptjs");

const crypto = require("crypto");

const jwt = require("jsonwebtoken");

const User = require("../models/User");

/* =========================================================
   GENERATE ACCESS TOKEN
========================================================= */

const generateAccessToken = (userId) => {

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

const generateRefreshToken = (userId) => {

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
   HASH PASSWORD
========================================================= */

const hashPassword =
    async (password) => {

        const salt =
            await bcrypt.genSalt(10);

        return await bcrypt.hash(

            password,

            salt

        );

    };

/* =========================================================
   COMPARE PASSWORD
========================================================= */

const comparePassword =
    async (

        enteredPassword,

        storedPassword

    ) => {

        return await bcrypt.compare(

            enteredPassword,

            storedPassword

        );

    };

/* =========================================================
   GENERATE RANDOM TOKEN
========================================================= */

const generateRandomToken =
    () => {

        return crypto.randomBytes(32)
            .toString("hex");

    };

/* =========================================================
   CREATE USER
========================================================= */

const createUser =
    async (userData) => {

        const {

            fullName,

            username,

            email,

            password

        } = userData;

        /* =========================
           CHECK EXISTING USER
        ========================= */

        const existingUser =
            await User.findOne({

                $or: [

                    {

                        email

                    },

                    {

                        username

                    }

                ]

            });

        if (existingUser) {

            throw new Error(

                "User already exists."

            );

        }

        /* =========================
           HASH PASSWORD
        ========================= */

        const hashedPassword =
            await hashPassword(

                password

            );

        /* =========================
           EMAIL VERIFICATION TOKEN
        ========================= */

        const verificationToken =
            generateRandomToken();

        /* =========================
           CREATE USER
        ========================= */

        const user =
            await User.create({

                fullName,

                username,

                email,

                password: hashedPassword,

                emailVerificationToken:
                    verificationToken,

                isVerified: false

            });

        return {

            user,

            verificationToken

        };

    };

/* =========================================================
   VALIDATE USER LOGIN
========================================================= */

const validateUserLogin =
    async (

        email,

        password

    ) => {

        const user =
            await User.findOne({

                email

            });

        if (!user) {

            throw new Error(

                "User not found."

            );

        }

        const isMatch =
            await comparePassword(

                password,

                user.password

            );

        if (!isMatch) {

            throw new Error(

                "Invalid credentials."

            );

        }

        return user;

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
   GENERATE PASSWORD RESET TOKEN
========================================================= */

const generatePasswordResetToken =
    async (email) => {

        const user =
            await User.findOne({

                email

            });

        if (!user) {

            throw new Error(

                "User not found."

            );

        }

        const resetToken =
            generateRandomToken();

        user.resetPasswordToken =
            resetToken;

        user.resetPasswordExpires =
            Date.now() + 3600000;

        await user.save();

        return {

            user,

            resetToken

        };

    };

/* =========================================================
   RESET PASSWORD
========================================================= */

const resetUserPassword =
    async (

        token,

        newPassword

    ) => {

        const user =
            await User.findOne({

                resetPasswordToken:
                    token,

                resetPasswordExpires: {

                    $gt: Date.now()

                }

            });

        if (!user) {

            throw new Error(

                "Invalid or expired reset token."

            );

        }

        user.password =
            await hashPassword(

                newPassword

            );

        user.resetPasswordToken =
            undefined;

        user.resetPasswordExpires =
            undefined;

        await user.save();

        return user;

    };

/* =========================================================
   VERIFY EMAIL
========================================================= */

const verifyUserEmail =
    async (token) => {

        const user =
            await User.findOne({

                emailVerificationToken:
                    token

            });

        if (!user) {

            throw new Error(

                "Invalid verification token."

            );

        }

        user.isVerified = true;

        user.emailVerificationToken =
            undefined;

        await user.save();

        return user;

    };

/* =========================================================
   RESEND VERIFICATION TOKEN
========================================================= */

const resendVerificationToken =
    async (email) => {

        const user =
            await User.findOne({

                email

            });

        if (!user) {

            throw new Error(

                "User not found."

            );

        }

        const verificationToken =
            generateRandomToken();

        user.emailVerificationToken =
            verificationToken;

        await user.save();

        return {

            user,

            verificationToken

        };

    };

/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

const refreshUserAccessToken =
    async (refreshToken) => {

        if (!refreshToken) {

            throw new Error(

                "Refresh token required."

            );

        }

        const decoded =
            jwt.verify(

                refreshToken,

                process.env.JWT_REFRESH_SECRET

            );

        const accessToken =
            generateAccessToken(

                decoded.id

            );

        return accessToken;

    };

/* =========================================================
   UPDATE USER PASSWORD
========================================================= */

const updateUserPassword =
    async (

        userId,

        currentPassword,

        newPassword

    ) => {

        const user =
            await User.findById(

                userId

            );

        if (!user) {

            throw new Error(

                "User not found."

            );

        }

        const isMatch =
            await comparePassword(

                currentPassword,

                user.password

            );

        if (!isMatch) {

            throw new Error(

                "Current password is incorrect."

            );

        }

        user.password =
            await hashPassword(

                newPassword

            );

        await user.save();

        return user;

    };

/* =========================================================
   GET AUTHENTICATED USER
========================================================= */

const getAuthenticatedUser =
    async (userId) => {

        const user =
            await User.findById(

                userId

            ).select("-password");

        if (!user) {

            throw new Error(

                "User not found."

            );

        }

        return user;

    };

/* =========================================================
   EXPORT SERVICES
========================================================= */

module.exports = {

    generateAccessToken,

    generateRefreshToken,

    generateAuthTokens,

    hashPassword,

    comparePassword,

    generateRandomToken,

    createUser,

    validateUserLogin,

    generatePasswordResetToken,

    resetUserPassword,

    verifyUserEmail,

    resendVerificationToken,

    refreshUserAccessToken,

    updateUserPassword,

    getAuthenticatedUser

};
