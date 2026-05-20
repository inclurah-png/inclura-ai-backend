/* =========================================================
   INCLURA POST MODEL
   Enterprise Social Content Engine
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   COMMENT SCHEMA
========================================================= */

const commentSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    content: {

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

    likes: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   POST SCHEMA
========================================================= */

const postSchema = new mongoose.Schema({

    /* =========================================
       POST OWNER
    ========================================= */

    author: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       CONTENT
    ========================================= */

    content: {

        type: String,

        maxlength: 5000,

        default: ""

    },

    /* =========================================
       CONTENT TYPE
    ========================================= */

    postType: {

        type: String,

        enum: [

            "text",

            "image",

            "video",

            "carousel",

            "document"

        ],

        default: "text"

    },

    /* =========================================
       MEDIA FILES
    ========================================= */

    media: [

        {

            url: {

                type: String,

                required: true

            },

            mediaType: {

                type: String,

                enum: [

                    "image",

                    "video",

                    "document"

                ]

            },

            thumbnail: {

                type: String,

                default: ""

            }

        }

    ],

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        altText: {

            type: String,

            default: ""

        },

        captions: {

            type: String,

            default: ""

        },

        imageDescription: {

            type: String,

            default: ""

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
       SOCIAL FEATURES
    ========================================= */

    likes: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    saves: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    shares: {

        type: Number,

        default: 0

    },

    reposts: {

        type: Number,

        default: 0

    },

    comments: [

        commentSchema

    ],

    /* =========================================
       TAGGING SYSTEM
    ========================================= */

    taggedUsers: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    taggedProducts: [

        {

            type: String

        }

    ],

    hashtags: [

        {

            type: String

        }

    ],

    /* =========================================
       CREATOR FEATURES
    ========================================= */

    monetized: {

        type: Boolean,

        default: false

    },

    premiumContent: {

        type: Boolean,

        default: false

    },

    sponsored: {

        type: Boolean,

        default: false

    },

    analytics: {

        views: {

            type: Number,

            default: 0

        },

        reach: {

            type: Number,

            default: 0

        },

        engagement: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       VISIBILITY
    ========================================= */

    visibility: {

        type: String,

        enum: [

            "public",

            "followers",

            "private"

        ],

        default: "public"

    },

    /* =========================================
       MODERATION
    ========================================= */

    moderation: {

        flagged: {

            type: Boolean,

            default: false

        },

        removed: {

            type: Boolean,

            default: false

        },

        moderationReason: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       LOCATION
    ========================================= */

    location: {

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

postSchema.index({

    author: 1

});

postSchema.index({

    hashtags: 1

});

postSchema.index({

    createdAt: -1

});

postSchema.index({

    "analytics.views": -1

});

/* =========================================================
   VIRTUALS
========================================================= */

postSchema.virtual("likesCount")
    .get(function() {

        return this.likes.length;

    });

postSchema.virtual("commentsCount")
    .get(function() {

        return this.comments.length;

    });

postSchema.virtual("savesCount")
    .get(function() {

        return this.saves.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

postSchema.methods.incrementViews =
    async function() {

        this.analytics.views += 1;

        await this.save();

    };

postSchema.methods.incrementShares =
    async function() {

        this.shares += 1;

        await this.save();

    };

postSchema.methods.incrementReposts =
    async function() {

        this.reposts += 1;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

postSchema.statics.getTrendingPosts =
    async function(limit = 20) {

        return this.find({

            visibility: "public",

            "moderation.removed": false

        })

        .sort({

            "analytics.engagement": -1,

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "author",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Post = mongoose.model(

    "Post",

    postSchema

);

module.exports = Post;
