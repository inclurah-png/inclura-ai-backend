/* =========================================================
   INCLURA LIVESTREAM MODEL
   Enterprise Livestream Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   LIVESTREAM CHAT SCHEMA
========================================================= */

const livestreamChatSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    message: {

        type: String,

        required: true,

        maxlength: 1000

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
   LIVESTREAM REACTION SCHEMA
========================================================= */

const livestreamReactionSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User"

    },

    reaction: {

        type: String,

        enum: [

            "like",

            "love",

            "fire",

            "wow",

            "clap"

        ],

        default: "like"

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   LIVESTREAM SCHEMA
========================================================= */

const livestreamSchema = new mongoose.Schema({

    /* =========================================
       STREAM HOST
    ========================================= */

    host: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       STREAM DETAILS
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

    thumbnail: {

        type: String,

        default: ""

    },

    category: {

        type: String,

        enum: [

            "creator",

            "gaming",

            "education",

            "mentorship",

            "business",

            "music",

            "emergency",

            "community"

        ],

        default: "creator"

    },

    /* =========================================
       STREAM STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "scheduled",

            "live",

            "ended"

        ],

        default: "scheduled"

    },

    /* =========================================
       STREAM URLS
    ========================================= */

    streamKey: {

        type: String,

        required: true

    },

    playbackUrl: {

        type: String,

        default: ""

    },

    recordingUrl: {

        type: String,

        default: ""

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        captionsEnabled: {

            type: Boolean,

            default: true

        },

        liveCaptions: {

            type: String,

            default: ""

        },

        signLanguageSupport: {

            type: Boolean,

            default: false

        },

        voiceReadable: {

            type: Boolean,

            default: true

        },

        screenReaderOptimized: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       REALTIME VIEWERS
    ========================================= */

    currentViewers: {

        type: Number,

        default: 0

    },

    peakViewers: {

        type: Number,

        default: 0

    },

    totalViews: {

        type: Number,

        default: 0

    },

    viewers: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    /* =========================================
       CHAT SYSTEM
    ========================================= */

    chatEnabled: {

        type: Boolean,

        default: true

    },

    chats: [

        livestreamChatSchema

    ],

    /* =========================================
       REACTIONS
    ========================================= */

    reactions: [

        livestreamReactionSchema

    ],

    /* =========================================
       MONETIZATION
    ========================================= */

    monetized: {

        type: Boolean,

        default: false

    },

    donationsEnabled: {

        type: Boolean,

        default: false

    },

    subscriptionOnly: {

        type: Boolean,

        default: false

    },

    totalDonations: {

        type: Number,

        default: 0

    },

    /* =========================================
       MODERATION
    ========================================= */

    moderators: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    blockedUsers: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    reports: {

        type: Number,

        default: 0

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
       ANALYTICS
    ========================================= */

    analytics: {

        totalMessages: {

            type: Number,

            default: 0

        },

        totalReactions: {

            type: Number,

            default: 0

        },

        averageWatchTime: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       SCHEDULE
    ========================================= */

    scheduledAt: {

        type: Date,

        default: null

    },

    startedAt: {

        type: Date,

        default: null

    },

    endedAt: {

        type: Date,

        default: null

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

livestreamSchema.index({

    host: 1

});

livestreamSchema.index({

    status: 1

});

livestreamSchema.index({

    category: 1

});

livestreamSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

livestreamSchema.virtual("chatCount")
    .get(function() {

        return this.chats.length;

    });

livestreamSchema.virtual("reactionCount")
    .get(function() {

        return this.reactions.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

livestreamSchema.methods.startStream =
    async function() {

        this.status = "live";

        this.startedAt = new Date();

        await this.save();

    };

livestreamSchema.methods.endStream =
    async function() {

        this.status = "ended";

        this.endedAt = new Date();

        await this.save();

    };

livestreamSchema.methods.incrementViewers =
    async function() {

        this.currentViewers += 1;

        this.totalViews += 1;

        if (

            this.currentViewers >

            this.peakViewers

        ) {

            this.peakViewers =
                this.currentViewers;

        }

        await this.save();

    };

livestreamSchema.methods.decrementViewers =
    async function() {

        if (this.currentViewers > 0) {

            this.currentViewers -= 1;

        }

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

livestreamSchema.statics.getTrendingStreams =
    async function(limit = 20) {

        return this.find({

            status: "live"

        })

        .sort({

            currentViewers: -1

        })

        .limit(limit)

        .populate(

            "host",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Livestream = mongoose.model(

    "Livestream",

    livestreamSchema

);

module.exports = Livestream;
