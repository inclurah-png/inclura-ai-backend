/* =========================================================
   INCLURA MENTORSHIP CONTROLLER
   Enterprise Mentorship Business Logic
   ========================================================= */

const Mentorship =
    require("../models/Mentorship");

const Wallet =
    require("../models/Wallet");

const Transaction =
    require("../models/Transaction");

const User =
    require("../models/User");

/* =========================================================
   CREATE MENTORSHIP
========================================================= */

exports.createMentorship =
    async (req, res) => {

        try {

            const {

                title,

                description,

                category,

                price,

                currency,

                duration,

                meetingType,

                accessibility

            } = req.body;

            const mentorship =
                await Mentorship.create({

                    mentor: req.user.id,

                    title,

                    description,

                    category,

                    price,

                    currency,

                    duration,

                    meetingType,

                    accessibility,

                    status: "active"

                });

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship created successfully.",

                mentorship

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to create mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET ALL MENTORSHIPS
========================================================= */

exports.getAllMentorships =
    async (req, res) => {

        try {

            const mentorships =
                await Mentorship.find({

                    status: "active"

                })

                .populate(

                    "mentor",

                    "fullName username profilePhoto verified"

                )

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                mentorships

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentorships.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET SINGLE MENTORSHIP
========================================================= */

exports.getSingleMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                )

                .populate(

                    "mentor",

                    "fullName username profilePhoto verified"

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                mentorship

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   UPDATE MENTORSHIP
========================================================= */

exports.updateMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            if (

                mentorship.mentor.toString() !==
                req.user.id

            ) {

                return res.status(403).json({

                    success: false,

                    accessible: true,

                    message:

                        "Unauthorized."

                });

            }

            Object.assign(

                mentorship,

                req.body

            );

            await mentorship.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship updated successfully.",

                mentorship

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to update mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   DELETE MENTORSHIP
========================================================= */

exports.deleteMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            await mentorship.deleteOne();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship deleted successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to delete mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   BOOK MENTORSHIP
========================================================= */

exports.bookMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            const studentWallet =
                await Wallet.findOne({

                    user: req.user.id

                });

            const mentorWallet =
                await Wallet.findOne({

                    user: mentorship.mentor

                });

            if (

                !studentWallet ||

                !mentorWallet

            ) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Wallet not found."

                });

            }

            if (

                studentWallet.balance <
                mentorship.price

            ) {

                return res.status(400).json({

                    success: false,

                    accessible: true,

                    message:

                        "Insufficient balance."

                });

            }

            /* =========================
               PROCESS PAYMENT
            ========================= */

            studentWallet.balance -=
                mentorship.price;

            mentorWallet.balance +=
                mentorship.price;

            await studentWallet.save();

            await mentorWallet.save();

            /* =========================
               CREATE TRANSACTION
            ========================= */

            const transaction =
                await Transaction.create({

                    user: req.user.id,

                    type:
                        "mentorship-payment",

                    amount:
                        mentorship.price,

                    currency:
                        mentorship.currency,

                    status:
                        "successful"

                });

            mentorship.bookings.push({

                student: req.user.id,

                bookedAt: Date.now(),

                status: "booked"

            });

            mentorship.bookingCount += 1;

            await mentorship.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship booked successfully.",

                transaction

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to book mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   CANCEL MENTORSHIP
========================================================= */

exports.cancelMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            mentorship.bookings =
                mentorship.bookings.map(

                    (booking) => {

                        if (

                            booking.student.toString() ===
                            req.user.id

                        ) {

                            booking.status =
                                "cancelled";

                        }

                        return booking;

                    }

                );

            await mentorship.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship cancelled successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to cancel mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   COMPLETE MENTORSHIP
========================================================= */

exports.completeMentorship =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            mentorship.bookings =
                mentorship.bookings.map(

                    (booking) => {

                        if (

                            booking.student.toString() ===
                            req.user.id

                        ) {

                            booking.status =
                                "completed";

                        }

                        return booking;

                    }

                );

            await mentorship.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Mentorship completed successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to complete mentorship.",

                error: error.message

            });

        }

    };

/* =========================================================
   ADD MENTOR REVIEW
========================================================= */

exports.addMentorReview =
    async (req, res) => {

        try {

            const mentorship =
                await Mentorship.findById(

                    req.params.mentorshipId

                );

            if (!mentorship) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentorship not found."

                });

            }

            const review = {

                user: req.user.id,

                rating:
                    req.body.rating,

                comment:
                    req.body.comment,

                createdAt:
                    Date.now()

            };

            mentorship.reviews.push(
                review
            );

            await mentorship.save();

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Review added successfully.",

                reviews:
                    mentorship.reviews

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to add review.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MENTOR REVIEWS
========================================================= */

exports.getMentorReviews =
    async (req, res) => {

        try {

            const mentorships =
                await Mentorship.find({

                    mentor:
                        req.params.mentorId

                });

            let allReviews = [];

            mentorships.forEach(

                (mentorship) => {

                    allReviews.push(

                        ...mentorship.reviews

                    );

                }

            );

            return res.status(200).json({

                success: true,

                accessible: true,

                reviews: allReviews

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentor reviews.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET TRENDING MENTORS
========================================================= */

exports.getTrendingMentors =
    async (req, res) => {

        try {

            const mentors =
                await Mentorship.find({

                    status: "active"

                })

                .sort({

                    bookingCount: -1

                })

                .limit(20);

            return res.status(200).json({

                success: true,

                accessible: true,

                mentors

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch trending mentors.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET EXPLORE MENTORS
========================================================= */

exports.getExploreMentors =
    async (req, res) => {

        try {

            const mentors =
                await Mentorship.find({

                    status: "active"

                })

                .sort({

                    createdAt: -1

                })

                .limit(30);

            return res.status(200).json({

                success: true,

                accessible: true,

                mentors

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch explore mentors.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET CATEGORY MENTORS
========================================================= */

exports.getCategoryMentors =
    async (req, res) => {

        try {

            const mentors =
                await Mentorship.find({

                    category:
                        req.params.categoryName,

                    status: "active"

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                mentors

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch category mentors.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MENTOR PROFILE
========================================================= */

exports.getMentorProfile =
    async (req, res) => {

        try {

            const mentor =
                await User.findById(

                    req.params.mentorId

                )

                .select(

                    "fullName username bio profilePhoto verified"

                );

            if (!mentor) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Mentor not found."

                });

            }

            const mentorships =
                await Mentorship.find({

                    mentor:
                        req.params.mentorId

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                mentor,

                mentorships

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentor profile.",

                error: error.message

            });

        }

    };
