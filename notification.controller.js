/* =========================================================
   INCLURA NOTIFICATION CONTROLLER
   Enterprise Notification Business Logic
   ========================================================= */

const Notification =
    require("../models/Notification");

const User =
    require("../models/User");

/* =========================================================
   GET ALL NOTIFICATIONS
========================================================= */

exports.getNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET UNREAD NOTIFICATIONS
========================================================= */

exports.getUnreadNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    isRead: false

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                unreadCount:
                    notifications.length,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch unread notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   MARK NOTIFICATION AS READ
========================================================= */

exports.markNotificationAsRead =
    async (req, res) => {

        try {

            const notification =
                await Notification.findById(

                    req.params.notificationId

                );

            if (!notification) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Notification not found."

                });

            }

            notification.isRead = true;

            await notification.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Notification marked as read.",

                notification

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to update notification.",

                error: error.message

            });

        }

    };

/* =========================================================
   MARK ALL NOTIFICATIONS AS READ
========================================================= */

exports.markAllNotificationsAsRead =
    async (req, res) => {

        try {

            await Notification.updateMany(

                {

                    recipient: req.user.id,

                    isRead: false

                },

                {

                    isRead: true

                }

            );

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "All notifications marked as read."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to mark notifications as read.",

                error: error.message

            });

        }

    };

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

exports.deleteNotification =
    async (req, res) => {

        try {

            const notification =
                await Notification.findById(

                    req.params.notificationId

                );

            if (!notification) {

                return res.status(404).json({

                    success: false,

                    accessible: true,

                    message:

                        "Notification not found."

                });

            }

            await notification.deleteOne();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Notification deleted successfully."

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to delete notification.",

                error: error.message

            });

        }

    };

/* =========================================================
   UPDATE NOTIFICATION SETTINGS
========================================================= */

exports.updateNotificationSettings =
    async (req, res) => {

        try {

            const user =
                await User.findById(

                    req.user.id

                );

            user.notificationSettings = {

                ...user.notificationSettings,

                ...req.body

            };

            await user.save();

            return res.status(200).json({

                success: true,

                accessible: true,

                message:

                    "Notification settings updated successfully.",

                settings:
                    user.notificationSettings

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to update notification settings.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET NOTIFICATION SETTINGS
========================================================= */

exports.getNotificationSettings =
    async (req, res) => {

        try {

            const user =
                await User.findById(

                    req.user.id

                );

            return res.status(200).json({

                success: true,

                accessible: true,

                settings:
                    user.notificationSettings

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch notification settings.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MESSAGE NOTIFICATIONS
========================================================= */

exports.getMessageNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "message"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch message notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET LIVESTREAM NOTIFICATIONS
========================================================= */

exports.getLivestreamNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "livestream"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch livestream notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MENTORSHIP NOTIFICATIONS
========================================================= */

exports.getMentorshipNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "mentorship"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch mentorship notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET MARKETPLACE NOTIFICATIONS
========================================================= */

exports.getMarketplaceNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "marketplace"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch marketplace notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET WALLET NOTIFICATIONS
========================================================= */

exports.getWalletNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "wallet"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch wallet notifications.",

                error: error.message

            });

        }

    };

/* =========================================================
   GET SECURITY NOTIFICATIONS
========================================================= */

exports.getSecurityNotifications =
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({

                    recipient: req.user.id,

                    category: "security"

                })

                .sort({

                    createdAt: -1

                });

            return res.status(200).json({

                success: true,

                accessible: true,

                notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,

                accessible: true,

                message:

                    "Failed to fetch security notifications.",

                error: error.message

            });

        }

    };
