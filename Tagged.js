/* =========================================================
   INCLURA TAGGED MODEL
   Enterprise Tagging & Discovery Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   TAG ENGAGEMENT SCHEMA
========================================================= */

const tagEngagementSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User"

    },

    engagementType: {

        type: String,

        enum: [

            "view",

            "click",

            "share",

            "save",

            "mention"

        ],

        default: "view"

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   TAGGED SCHEMA
========================================================= */

const taggedSchema = new mongoose.Schema({

    /* =========================================
       TAG INFORMATION
    ========================================= */

    tag: {

        type: String,

        required: true,

        lowercase: true,

        trim: true,

        maxlength: 100

    },

    normalizedTag: {

        type: String,

        required: true,

        lowercase: true,

        trim: true

    },

    /* =========================================
       TAG TYPE
    ========================================= */

    tagType: {

        type: String,

        enum: [

            "user",

            "creator",

            "business",

            "marketplace",

            "livestream",

            "reel",

            "post",

            "care-gig",

            "mentorship",

            "emergency",

            "hashtag"

        ],

        default: "hashtag"

    },

    /* =========================================
       RELATED CONTENT
    ========================================= */

    taggedUser: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

    },

    post: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Post",

        default: null

    },

    reel: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Reel",

        default: null

    },

    livestream: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Livestream",

        default: null

    },

    marketplace: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Marketplace",

        default: null

    },

    careGig: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "CareGig",

        default: null

    },

    mentorship: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Mentorship",

        default: null

    },

    emergency: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Emergency",

        default: null

    },

    /* =========================================
       TAG CREATOR
    ========================================= */

    createdBy: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

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

        readableDescription: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       DISCOVERY SYSTEM
    ========================================= */

    searchable: {

        type: Boolean,

        default: true

    },

    trending: {

        type: Boolean,

        default: false

    },

    featured: {

        type: Boolean,

        default: false

    },

    relatedTags: [

        {

            type: String

        }

    ],

    /* =========================================
       ENGAGEMENT ANALYTICS
    ========================================= */

    engagements: [

        tagEngagementSchema

    ],

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

        totalMentions: {

            type: Number,

            default: 0

        },

        engagementScore: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       MODERATION
    ========================================= */

    moderation: {

        approved: {

            type: Boolean,

            default: true

        },

        reported: {

            type: Boolean,

            default: false

        },

        blocked: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "active",

            "inactive",

            "removed"

        ],

        default: "active"

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

taggedSchema.index({

    tag: 1

});

taggedSchema.index({

    normalizedTag: 1

});

taggedSchema.index({

    tagType: 1

});

taggedSchema.index({

    trending: 1

});

taggedSchema.index({

    searchable: 1

});

taggedSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

taggedSchema.virtual("engagementCount")
    .get(function() {

        return this.engagements.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

taggedSchema.methods.incrementViews =
    async function() {

        this.analytics.totalViews += 1;

        await this.save();

    };

taggedSchema.methods.incrementClicks =
    async function() {

        this.analytics.totalClicks += 1;

        await this.save();

    };

taggedSchema.methods.incrementMentions =
    async function() {

        this.analytics.totalMentions += 1;

        await this.save();

    };

taggedSchema.methods.calculateEngagementScore =
    async function() {

        this.analytics.engagementScore = (

            this.analytics.totalViews +

            (this.analytics.totalClicks * 2) +

            (this.analytics.totalShares * 3) +

            (this.analytics.totalMentions * 4)

        );

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

taggedSchema.statics.getTrendingTags =
    async function(limit = 20) {

        return this.find({

            trending: true,

            status: "active"

        })

        .sort({

            "analytics.engagementScore": -1

        })

        .limit(limit);

    };

taggedSchema.statics.searchTags =
    async function(searchTerm) {

        return this.find({

            normalizedTag: {

                $regex: searchTerm,

                $options: "i"

            },

            searchable: true,

            status: "active"

        });

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Tagged = mongoose.model(

    "Tagged",

    taggedSchema

);

module.exports = Tagged;
