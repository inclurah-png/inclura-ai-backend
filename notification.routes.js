/* =========================================================
   INCLURA NOTIFICATION ROUTES
   Enterprise Notification Infrastructure
   ========================================================= */

const express = require("express");

const router = express.Router();

/* =========================================================
   CONTROLLERS
========================================================= */

const {

    getNotifications,

    getUnreadNotifications,

    markNotificationAsRead,

    markAllNotificationsAsRead,

    deleteNotification,

    updateNotificationSettings,

    getNotificationSettings,

    getMessageNotifications,

    getLivestreamNotifications,

    getMentorshipNotifications,

    getMarketplaceNotifications,

    getWalletNotifications,

    getSecurityNotifications

} = require("../controllers/notification.controller");

/* =========================================================
   MIDDLEWARES
========================================================= */

const authMiddleware =
    require("../middlewares/auth.middleware");

/* =========================================================
   NOTIFICATION ROUTES
========================================================= */

/* =========================================
   GET ALL NOTIFICATIONS
========================================= */

router.get(

    "/",

    authMiddleware,

    getNotifications

);

/* =========================================
   GET UNREAD NOTIFICATIONS
========================================= */

router.get(

    "/unread",

    authMiddleware,

    getUnreadNotifications

);

/* =========================================
   MARK NOTIFICATION AS READ
========================================= */

router.put(

    "/read/:notificationId",

    authMiddleware,

    markNotificationAsRead

);

/* =========================================
   MARK ALL NOTIFICATIONS AS READ
========================================= */

router.put(

    "/read-all",

    authMiddleware,

    markAllNotificationsAsRead

);

/* =========================================
   DELETE NOTIFICATION
========================================= */

router.delete(

    "/:notificationId",

    authMiddleware,

    deleteNotification

);

/* =========================================================
   NOTIFICATION SETTINGS
========================================================= */

/* =========================================
   UPDATE NOTIFICATION SETTINGS
========================================= */

router.put(

    "/settings/update",

    authMiddleware,

    updateNotificationSettings

);

/* =========================================
   GET NOTIFICATION SETTINGS
========================================= */

router.get(

    "/settings",

    authMiddleware,

    getNotificationSettings

);

/* =========================================================
   CATEGORY NOTIFICATIONS
========================================================= */

/* =========================================
   MESSAGE NOTIFICATIONS
========================================= */

router.get(

    "/category/messages",

    authMiddleware,

    getMessageNotifications

);

/* =========================================
   LIVESTREAM NOTIFICATIONS
========================================= */

router.get(

    "/category/livestreams",

    authMiddleware,

    getLivestreamNotifications

);

/* =========================================
   MENTORSHIP NOTIFICATIONS
========================================= */

router.get(

    "/category/mentorships",

    authMiddleware,

    getMentorshipNotifications

);

/* =========================================
   MARKETPLACE NOTIFICATIONS
========================================= */

router.get(

    "/category/marketplace",

    authMiddleware,

    getMarketplaceNotifications

);

/* =========================================
   WALLET NOTIFICATIONS
========================================= */

router.get(

    "/category/wallet",

    authMiddleware,

    getWalletNotifications

);

/* =========================================
   SECURITY NOTIFICATIONS
========================================= */

router.get(

    "/category/security",

    authMiddleware,

    getSecurityNotifications

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

                voiceReadableNotifications: true,

                screenReaderOptimizedAlerts: true,

                accessibleNotificationResponses: true

            },

            message:

                "Notification accessibility services are active."

        });

    }

);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
