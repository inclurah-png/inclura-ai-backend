/* =========================================================
   INCLURA LIVESTREAM CONTROLLER
   Enterprise Realtime Streaming Logic
   ========================================================= */

const Livestream =
    require("../models/Livestream");

const User =
    require("../models/User");

/* =========================================================
   CREATE LIVESTREAM
========================================================= */

exports.createLivestream =
    async (req, res) => {

        try {

            const {

                title,

                description,

                thumbnail,

                streamType,

                tags,

                accessibility

            } = req.body;

            const livestream =
                await Livestream.create({

                    creator: req.user.id,

                    title,

                    description,

                    thumbnail,

                    streamType,

                    tags,

                    accessibility,

                    status: "live",

                    startedAt: Date.now()

                });

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Livestream created successfully.",

                livestream

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to create livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET ALL LIVESTREAMS
========================================================= */

exports.getAllLivestreams =
    async (req, res) => {

        try {

            const livestreams =
                await Livestream.find({

                    status: "live"

                })

                .populate(

                    "creator",

                    "fullName username profilePhoto verified"

                )

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                livestreams

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch livestreams.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET SINGLE LIVESTREAM
========================================================= */

exports.getSingleLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                )

                .populate(

                    "creator",

                    "fullName username profilePhoto verified"

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                livestream

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   UPDATE LIVESTREAM
========================================================= */

exports.updateLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            if (

                livestream.creator.toString() !==
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

                livestream,

                req.body

            );

            await livestream.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Livestream updated successfully.",

                livestream

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to update livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   DELETE LIVESTREAM
========================================================= */

exports.deleteLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            await livestream.deleteOne();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Livestream deleted successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to delete livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   END LIVESTREAM
========================================================= */

exports.endLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            livestream.status =
                "ended";

            livestream.endedAt =
                Date.now();

            await livestream.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Livestream ended successfully.",

                livestream

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to end livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   JOIN LIVESTREAM
========================================================= */

exports.joinLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            if (

                !livestream.viewers.includes(
                    req.user.id
                )

            ) {

                livestream.viewers.push(
                    req.user.id
                );

                livestream.viewerCount += 1;

                await livestream.save();

            }

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Joined livestream successfully.",

                viewerCount:
                    livestream.viewerCount

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to join livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   LEAVE LIVESTREAM
========================================================= */

exports.leaveLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            livestream.viewers =
                livestream.viewers.filter(

                    (viewer) =>

                        viewer.toString() !==
                        req.user.id

                );

            if (

                livestream.viewerCount > 0

            ) {

                livestream.viewerCount -= 1;

            }

            await livestream.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Left livestream successfully.",

                viewerCount:
                    livestream.viewerCount

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to leave livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   COMMENT ON LIVESTREAM
========================================================= */

exports.commentOnLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            const newComment = {

                user: req.user.id,

                text: req.body.text,

                createdAt: Date.now()

            };

            livestream.comments.push(
                newComment
            );

            await livestream.save();

            return res.status(201).json({

                success: true,

                accessible: true,

                message:

                    "Comment added successfully.",

                comments:
                    livestream.comments

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to comment on livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   REACT TO LIVESTREAM
========================================================= */

exports.reactToLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            livestream.reactions.push({

                user: req.user.id,

                reactionType:
                    req.body.reactionType,

                createdAt: Date.now()

            });

            await livestream.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Reaction added successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to react to livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   SHARE LIVESTREAM
========================================================= */

exports.shareLivestream =
    async (req, res) => {

        try {

            const livestream =
                await Livestream.findById(

                    req.params.livestreamId

                );

            if (!livestream) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Livestream not found."

                });

            }

            livestream.shareCount += 1;

            await livestream.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Livestream shared successfully.",

                shareCount:
                    livestream.shareCount

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to share livestream.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET TRENDING LIVESTREAMS
========================================================= */

exports.getTrendingLivestreams =
    async (req, res) => {

        try {

            const livestreams =
                await Livestream.find({

                    status: "live"

                })

                .sort({

                    viewerCount: -1

                })

                .limit(20);

            return res.status(200).json({

                success: true,

                accessible: true,

                livestreams

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch trending livestreams.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET EXPLORE LIVESTREAMS
========================================================= */

exports.getExploreLivestreams =
    async (req, res) => {

        try {

            const livestreams =
                await Livestream.find({

                    status: "live"

                })

                .sort({

                    createdAt: -1

                })

                .limit(30);

            return res.status(200).json({

                success: true,

                accessible: true,

                livestreams

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch explore livestreams.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET CREATOR LIVESTREAMS
========================================================= */

exports.getCreatorLivestreams =
    async (req, res) => {

        try {

            const livestreams =
                await Livestream.find({

                    creator:
                        req.params.creatorId

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                livestreams

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch creator livestreams.",

                error: error.message

            });

        }

    };
