/* =========================================================
   INCLURA NOTIFICATION MODEL
   Enterprise Notification Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   NOTIFICATION SCHEMA
========================================================= */

const notificationSchema = new mongoose.Schema({

    /* =========================================
       RECIPIENT
    ========================================= */

    recipient: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       SENDER
    ========================================= */

    sender: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

    },

    /* =========================================
       NOTIFICATION TYPE
    ========================================= */

    notificationType: {

        type: String,

        enum: [

            "like",

            "comment",

            "follow",

            "mention",

            "repost",

            "message",

            "creator",

            "monetization",

            "livestream",

            "mentor",

            "business",

            "emergency",

            "system"

        ],

        required: true

    },

    /* =========================================
       TITLE
    ========================================= */

    title: {

        type: String,

        required: true,

        maxlength: 200

    },

    /* =========================================
       MESSAGE
    ========================================= */

    message: {

        type: String,

        required: true,

        maxlength: 2000

    },

    /* =========================================
       RELATED RESOURCE
    ========================================= */

    resourceType: {

        type: String,

        enum: [

            "Post",

            "Reel",

            "Message",

            "Conversation",

            "Livestream",

            "Wallet",

            "Emergency",

            "Mentorship"

        ],

        default: null

    },

    resourceId: {

        type: mongoose.Schema.Types.ObjectId,

        default: null

    },

    /* =========================================
       ACCESSIBILITY FEATURES
    ========================================= */

    accessibility: {

        voiceReadable: {

            type: Boolean,

            default: true

        },

        screenReaderOptimized: {

            type: Boolean,

            default: true

        },

        reducedMotion: {

            type: Boolean,

            default: false

        },

        priorityAlert: {

            type: Boolean,

            default: false

        },

        audioNotification: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       NOTIFICATION PRIORITY
    ========================================= */

    priority: {

        type: String,

        enum: [

            "low",

            "normal",

            "high",

            "urgent"

        ],

        default: "normal"

    },

    /* =========================================
       STATUS
    ========================================= */

    read: {

        type: Boolean,

        default: false

    },

    readAt: {

        type: Date,

        default: null

    },

    delivered: {

        type: Boolean,

        default: false

    },

    deliveredAt: {

        type: Date,

        default: null

    },

    /* =========================================
       REALTIME SUPPORT
    ========================================= */

    realtime: {

        type: Boolean,

        default: true

    },

    pushSent: {

        type: Boolean,

        default: false

    },

    emailSent: {

        type: Boolean,

        default: false

    },

    /* =========================================
       EMERGENCY SYSTEM
    ========================================= */

    emergencyBroadcast: {

        type: Boolean,

        default: false

    },

    emergencyLevel: {

        type: String,

        enum: [

            "none",

            "warning",

            "critical"

        ],

        default: "none"

    },

    /* =========================================
       CREATOR SYSTEM
    ========================================= */

    monetized: {

        type: Boolean,

        default: false

    },

    creatorAnalytics: {

        type: Boolean,

        default: false

    },

    /* =========================================
       ACTION URL
    ========================================= */

    actionUrl: {

        type: String,

        default: ""

    },

    /* =========================================
       ICON
    ========================================= */

    icon: {

        type: String,

        default: ""

    },

    /* =========================================
       TIMESTAMPS
    ========================================= */

    createdAt: {

        type: Date,

        default: Date.now

    },

    updatedAt: {

        type: Date,

        default: Date.now

    }

},

{

    timestamps: true

});

/* =========================================================
   INDEXES
========================================================= */

notificationSchema.index({

    recipient: 1

});

notificationSchema.index({

    notificationType: 1

});

notificationSchema.index({

    read: 1

});

notificationSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

notificationSchema.virtual("isUnread")
    .get(function() {

        return !this.read;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

notificationSchema.methods.markAsRead =
    async function() {

        this.read = true;

        this.readAt = new Date();

        await this.save();

    };

notificationSchema.methods.markAsDelivered =
    async function() {

        this.delivered = true;

        this.deliveredAt = new Date();

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

notificationSchema.statics.getUnreadNotifications =
    async function(userId) {

        return this.find({

            recipient: userId,

            read: false

        })

        .sort({

            createdAt: -1

        })

        .populate(

            "sender",

            "fullName username profilePhoto verified"

        );

    };

notificationSchema.statics.getUserNotifications =
    async function(

        userId,
        limit = 50

    ) {

        return this.find({

            recipient: userId

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "sender",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Notification = mongoose.model(

    "Notification",

    notificationSchema

);

module.exports = Notification;
