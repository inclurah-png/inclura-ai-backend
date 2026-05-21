/* =========================================================
   INCLURA AUTH CONTROLLER
   Enterprise Authentication Logic
   ========================================================= */

const bcrypt = require("bcryptjs");

const crypto = require("crypto");

const jwt = require("jsonwebtoken");

const User = require("../models/User");

/* =========================================================
   JWT GENERATOR
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
   REGISTER USER
========================================================= */

exports.registerUser =
    async (req, res) => {

        try {

            const {

                fullName,

                username,

                email,

                password

            } = req.body;

            /* =========================
               VALIDATION
            ========================= */

            if (

                !fullName ||

                !username ||

                !email ||

                !password

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "All required fields must be provided."

                });

            }

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

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "User already exists."

                });

            }

            /* =========================
               HASH PASSWORD
            ========================= */

            const salt =
                await bcrypt.genSalt(10);

            const hashedPassword =
                await bcrypt.hash(

                    password,

                    salt

                );

            /* =========================
               EMAIL VERIFICATION TOKEN
            ========================= */

            const verificationToken =
                crypto.randomBytes(32)
                    .toString("hex");

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

            /* =========================
               TOKENS
            ========================= */

            const accessToken =
                generateAccessToken(

                    user._id

                );

            const refreshToken =
                generateRefreshToken(

                    user._id

                );

            /* =========================
               RESPONSE
            ========================= */

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Registration successful.",

                tokens: {

                    accessToken,

                    refreshToken

                },

                user

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Registration failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   LOGIN USER
========================================================= */

exports.loginUser =
    async (req, res) => {

        try {

            const {

                email,

                password

            } = req.body;

            /* =========================
               VALIDATION
            ========================= */

            if (

                !email ||

                !password

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Email and password are required."

                });

            }

            /* =========================
               FIND USER
            ========================= */

            const user =
                await User.findOne({

                    email

                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "User not found."

                });

            }

            /* =========================
               PASSWORD VALIDATION
            ========================= */

            const isMatch =
                await bcrypt.compare(

                    password,

                    user.password

                );

            if (!isMatch) {

                return res.status(401).json({

                    success: false,

                    accessible: true,

                    message:

                        "Invalid credentials."

                });

            }

            /* =========================
               TOKENS
            ========================= */

            const accessToken =
                generateAccessToken(

                    user._id

                );

            const refreshToken =
                generateRefreshToken(

                    user._id

                );

            /* =========================
               RESPONSE
            ========================= */

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Login successful.",

                tokens: {

                    accessToken,

                    refreshToken

                },

                user

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Login failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   LOGOUT USER
========================================================= */

exports.logoutUser =
    async (req, res) => {

        try {

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Logout successful."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Logout failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   FORGOT PASSWORD
========================================================= */

exports.forgotPassword =
    async (req, res) => {

        try {

            const {

                email

            } = req.body;

            const user =
                await User.findOne({

                    email

                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "User not found."

                });

            }

            const resetToken =
                crypto.randomBytes(32)
                    .toString("hex");

            user.resetPasswordToken =
                resetToken;

            user.resetPasswordExpires =
                Date.now() + 3600000;

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Password reset token generated.",

                resetToken

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Forgot password failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   RESET PASSWORD
========================================================= */

exports.resetPassword =
    async (req, res) => {

        try {

            const {

                token

            } = req.params;

            const {

                password

            } = req.body;

            const user =
                await User.findOne({

                    resetPasswordToken:
                        token,

                    resetPasswordExpires: {

                        $gt: Date.now()

                    }

                });

            if (!user) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Invalid or expired token."

                });

            }

            const salt =
                await bcrypt.genSalt(10);

            user.password =
                await bcrypt.hash(

                    password,

                    salt

                );

            user.resetPasswordToken =
                undefined;

            user.resetPasswordExpires =
                undefined;

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Password reset successful."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Password reset failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

exports.refreshAccessToken =
    async (req, res) => {

        try {

            const {

                refreshToken

            } = req.body;

            if (!refreshToken) {

                return res.status(401).json({

                    success: false,

                    accessible: true,

                    message:

                        "Refresh token required."

                });

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

            return res.status(200).json({

                success: true,

                accessible: true,

                accessToken

            });

        } catch (error) {

            return res.status(401).json({

                success: false,

                accessible: true,

                message:

                    "Invalid refresh token.",

                error: error.message

            });

        }

    };

/* =========================================================
   VERIFY EMAIL
========================================================= */

exports.verifyEmail =
    async (req, res) => {

        try {

            const {

                token

            } = req.params;

            const user =
                await User.findOne({

                    emailVerificationToken:
                        token

                });

            if (!user) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Invalid verification token."

                });

            }

            user.isVerified = true;

            user.emailVerificationToken =
                undefined;

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Email verified successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Email verification failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   RESEND VERIFICATION EMAIL
========================================================= */

exports.resendVerificationEmail =
    async (req, res) => {

        try {

            const {

                email

            } = req.body;

            const user =
                await User.findOne({

                    email

                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "User not found."

                });

            }

            const verificationToken =
                crypto.randomBytes(32)
                    .toString("hex");

            user.emailVerificationToken =
                verificationToken;

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Verification email resent.",

                verificationToken

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Resend verification failed.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET AUTHENTICATED USER
========================================================= */

exports.getAuthenticatedUser =
    async (req, res) => {

        try {

            const user =
                await User.findById(

                    req.user.id

                ).select("-password");

            return res.status(200).json({

                success: true,

                accessible: true,

                user

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch user.",

                error: error.message

            });

        }

    };

/* =========================================================
   UPDATE PASSWORD
========================================================= */

exports.updatePassword =
    async (req, res) => {

        try {

            const {

                currentPassword,

                newPassword

            } = req.body;

            const user =
                await User.findById(

                    req.user.id

                );

            const isMatch =
                await bcrypt.compare(

                    currentPassword,

                    user.password

                );

            if (!isMatch) {

                return res.status(401).json({

                    success: false,

                    accessible: true,

                    message:

                        "Current password is incorrect."

                });

            }

            const salt =
                await bcrypt.genSalt(10);

            user.password =
                await bcrypt.hash(

                    newPassword,

                    salt

                );

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Password updated successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Password update failed.",

                error: error.message

            });

        }

    };
