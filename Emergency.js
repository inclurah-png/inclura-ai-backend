/* =========================================================
   INCLURA EMERGENCY MODEL
   Enterprise Emergency Response Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   RESPONDER SCHEMA
========================================================= */

const responderSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    role: {

        type: String,

        enum: [

            "medical",

            "security",

            "fire",

            "accessibility",

            "mental-health",

            "community"

        ],

        default: "community"

    },

    status: {

        type: String,

        enum: [

            "pending",

            "accepted",

            "resolved"

        ],

        default: "pending"

    },

    respondedAt: {

        type: Date,

        default: null

    }

});

/* =========================================================
   EMERGENCY MESSAGE SCHEMA
========================================================= */

const emergencyMessageSchema = new mongoose.Schema({

    sender: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    message: {

        type: String,

        required: true,

        maxlength: 2000

    },

    accessibility: {

        voiceReadable: {

            type: Boolean,

            default: true

        }

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   EMERGENCY SCHEMA
========================================================= */

const emergencySchema = new mongoose.Schema({

    /* =========================================
       EMERGENCY OWNER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       EMERGENCY TYPE
    ========================================= */

    emergencyType: {

        type: String,

        enum: [

            "medical",

            "security",

            "fire",

            "disaster",

            "accessibility",

            "mental-health",

            "community"

        ],

        required: true

    },

    /* =========================================
       EMERGENCY DETAILS
    ========================================= */

    title: {

        type: String,

        required: true,

        maxlength: 200

    },

    description: {

        type: String,

        maxlength: 5000,

        default: ""

    },

    severityLevel: {

        type: String,

        enum: [

            "low",

            "medium",

            "high",

            "critical"

        ],

        default: "medium"

    },

    /* =========================================
       LOCATION
    ========================================= */

    location: {

        address: {

            type: String,

            default: ""

        },

        latitude: {

            type: Number,

            default: 0

        },

        longitude: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       ACCESSIBILITY SUPPORT
    ========================================= */

    accessibility: {

        voiceTriggered: {

            type: Boolean,

            default: false

        },

        signLanguageSupport: {

            type: Boolean,

            default: false

        },

        screenReaderOptimized: {

            type: Boolean,

            default: true

        },

        voiceReadable: {

            type: Boolean,

            default: true

        },

        emergencyAccessibilityRequest: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       SOS FEATURES
    ========================================= */

    sosActivated: {

        type: Boolean,

        default: false

    },

    realtimeBroadcast: {

        type: Boolean,

        default: false

    },

    livestreamEnabled: {

        type: Boolean,

        default: false

    },

    livestreamId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Livestream",

        default: null

    },

    /* =========================================
       RESPONDERS
    ========================================= */

    responders: [

        responderSchema

    ],

    responderCount: {

        type: Number,

        default: 0

    },

    /* =========================================
       EMERGENCY CHAT
    ========================================= */

    messages: [

        emergencyMessageSchema

    ],

    /* =========================================
       FINANCIAL SUPPORT
    ========================================= */

    donationEnabled: {

        type: Boolean,

        default: false

    },

    totalDonations: {

        type: Number,

        default: 0

    },

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        default: null

    },

    /* =========================================
       STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "active",

            "responding",

            "resolved",

            "cancelled"

        ],

        default: "active"

    },

    resolvedAt: {

        type: Date,

        default: null

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        totalViews: {

            type: Number,

            default: 0

        },

        totalResponses: {

            type: Number,

            default: 0

        },

        averageResponseTime: {

            type: Number,

            default: 0

        }

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

emergencySchema.index({

    user: 1

});

emergencySchema.index({

    emergencyType: 1

});

emergencySchema.index({

    severityLevel: 1

});

emergencySchema.index({

    status: 1

});

emergencySchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

emergencySchema.virtual("messageCount")
    .get(function() {

        return this.messages.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

emergencySchema.methods.activateSOS =
    async function() {

        this.sosActivated = true;

        this.realtimeBroadcast = true;

        await this.save();

    };

emergencySchema.methods.resolveEmergency =
    async function() {

        this.status = "resolved";

        this.resolvedAt = new Date();

        await this.save();

    };

emergencySchema.methods.incrementResponses =
    async function() {

        this.analytics.totalResponses += 1;

        this.responderCount += 1;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

emergencySchema.statics.getActiveEmergencies =
    async function(limit = 50) {

        return this.find({

            status: "active"

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "user",

            "fullName username profilePhoto"

        );

    };

emergencySchema.statics.getCriticalEmergencies =
    async function() {

        return this.find({

            severityLevel: "critical",

            status: "active"

        })

        .populate(

            "user",

            "fullName username profilePhoto"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Emergency = mongoose.model(

    "Emergency",

    emergencySchema

);

module.exports = Emergency;
