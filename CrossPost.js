/* =========================================================
   INCLURA CROSS-POST MODEL
   Enterprise Cross-Posting Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   ENGAGEMENT SCHEMA
========================================================= */

const engagementSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User"

    },

    engagementType: {

        type: String,

        enum: [

            "view",

            "click",

            "like",

            "share",

            "save",

            "comment"

        ],

        default: "view"

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   CROSS-POST SCHEMA
========================================================= */

const crossPostSchema = new mongoose.Schema({

    /* =========================================
       USER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       ORIGINAL CONTENT
    ========================================= */

    originalPost: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Post",

        default: null

    },

    originalReel: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Reel",

        default: null

    },

    originalLivestream: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Livestream",

        default: null

    },

    originalMarketplace: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Marketplace",

        default: null

    },

    originalMentorship: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Mentorship",

        default: null

    },

    originalCareGig: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "CareGig",

        default: null

    },

    /* =========================================
       CONTENT TYPE
    ========================================= */

    contentType: {

        type: String,

        enum: [

            "post",

            "reel",

            "livestream",

            "marketplace",

            "mentorship",

            "care-gig"

        ],

        required: true

    },

    /* =========================================
       CROSS-POST MESSAGE
    ========================================= */

    caption: {

        type: String,

        maxlength: 5000,

        default: ""

    },

    hashtags: [

        {

            type: String

        }

    ],

    /* =========================================
       DISTRIBUTION TARGETS
    ========================================= */

    distributionTargets: [

        {

            type: String,

            enum: [

                "main-feed",

                "reels-feed",

                "marketplace-feed",

                "creator-feed",

                "care-feed",

                "mentorship-feed",

                "explore-feed",

                "trending-feed"

            ]

        }

    ],

    /* =========================================
       CREATOR DISTRIBUTION
    ========================================= */

    creatorBoostEnabled: {

        type: Boolean,

        default: false

    },

    promoted: {

        type: Boolean,

        default: false

    },

    audienceExpansion: {

        type: Boolean,

        default: false

    },

    /* =========================================
       ACCESSIBILITY
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

        altDescription: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        totalViews: {

            type: Number,

            default: 0

        },

        totalClicks: {

            type: Number,

            default: 0

        },

        totalShares: {

            type: Number,

            default: 0

        },

        totalLikes: {

            type: Number,

            default: 0

        },

        engagementScore: {

            type: Number,

            default: 0

        },

        reach: {

            type: Number,

            default: 0

        }

    },

    engagements: [

        engagementSchema

    ],

    /* =========================================
       MODERATION
    ========================================= */

    moderation: {

        spamFlagged: {

            type: Boolean,

            default: false

        },

        duplicateDetected: {

            type: Boolean,

            default: false

        },

        abuseReported: {

            type: Boolean,

            default: false

        },

        approved: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "active",

            "paused",

            "removed"

        ],

        default: "active"

    },

    visibility: {

        type: String,

        enum: [

            "public",

            "followers-only",

            "private"

        ],

        default: "public"

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

crossPostSchema.index({

    user: 1

});

crossPostSchema.index({

    contentType: 1

});

crossPostSchema.index({

    status: 1

});

crossPostSchema.index({

    promoted: 1

});

crossPostSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

crossPostSchema.virtual("engagementCount")
    .get(function() {

        return this.engagements.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

crossPostSchema.methods.incrementViews =
    async function() {

        this.analytics.totalViews += 1;

        await this.save();

    };

crossPostSchema.methods.incrementClicks =
    async function() {

        this.analytics.totalClicks += 1;

        await this.save();

    };

crossPostSchema.methods.incrementShares =
    async function() {

        this.analytics.totalShares += 1;

        await this.save();

    };

crossPostSchema.methods.calculateEngagementScore =
    async function() {

        this.analytics.engagementScore = (

            this.analytics.totalViews +

            (this.analytics.totalClicks * 2) +

            (this.analytics.totalShares * 3) +

            (this.analytics.totalLikes * 2)

        );

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

crossPostSchema.statics.getTrendingCrossPosts =
    async function(limit = 20) {

        return this.find({

            status: "active"

        })

        .sort({

            "analytics.engagementScore": -1

        })

        .limit(limit)

        .populate(

            "user",

            "fullName username profilePhoto verified"

        );

    };

crossPostSchema.statics.getCreatorBoostedPosts =
    async function(limit = 20) {

        return this.find({

            creatorBoostEnabled: true,

            status: "active"

        })

        .sort({

            createdAt: -1

        })

        .limit(limit);

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const CrossPost = mongoose.model(

    "CrossPost",

    crossPostSchema

);

module.exports = CrossPost;
