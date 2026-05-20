/* =========================================================
   INCLURA MENTORSHIP MODEL
   Enterprise Mentorship Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   REVIEW SCHEMA
========================================================= */

const reviewSchema = new mongoose.Schema({

    mentee: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    rating: {

        type: Number,

        min: 1,

        max: 5,

        required: true

    },

    review: {

        type: String,

        maxlength: 2000,

        default: ""

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   SESSION SCHEMA
========================================================= */

const sessionSchema = new mongoose.Schema({

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

    scheduledAt: {

        type: Date,

        required: true

    },

    duration: {

        type: Number,

        default: 60

    },

    sessionType: {

        type: String,

        enum: [

            "video",

            "audio",

            "chat",

            "livestream"

        ],

        default: "video"

    },

    status: {

        type: String,

        enum: [

            "scheduled",

            "ongoing",

            "completed",

            "cancelled"

        ],

        default: "scheduled"

    },

    meetingLink: {

        type: String,

        default: ""

    }

});

/* =========================================================
   MENTORSHIP SCHEMA
========================================================= */

const mentorshipSchema = new mongoose.Schema({

    /* =========================================
       MENTOR
    ========================================= */

    mentor: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       MENTEE
    ========================================= */

    mentee: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       MENTORSHIP CATEGORY
    ========================================= */

    category: {

        type: String,

        enum: [

            "business",

            "creator",

            "career",

            "technology",

            "accessibility",

            "education",

            "emergency-support",

            "wellness"

        ],

        default: "career"

    },

    /* =========================================
       MENTORSHIP DETAILS
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

    goals: [

        {

            type: String

        }

    ],

    /* =========================================
       SESSION MANAGEMENT
    ========================================= */

    sessions: [

        sessionSchema

    ],

    totalSessions: {

        type: Number,

        default: 0

    },

    completedSessions: {

        type: Number,

        default: 0

    },

    /* =========================================
       PAYMENT SYSTEM
    ========================================= */

    paidMentorship: {

        type: Boolean,

        default: false

    },

    sessionPrice: {

        type: Number,

        default: 0

    },

    currency: {

        type: String,

        default: "NGN"

    },

    totalRevenue: {

        type: Number,

        default: 0

    },

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        default: null

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        captionsEnabled: {

            type: Boolean,

            default: true

        },

        signLanguageSupport: {

            type: Boolean,

            default: false

        },

        voiceNavigation: {

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

        }

    },

    /* =========================================
       REALTIME SUPPORT
    ========================================= */

    realtimeChatEnabled: {

        type: Boolean,

        default: true

    },

    livestreamSupport: {

        type: Boolean,

        default: false

    },

    /* =========================================
       REVIEWS & RATINGS
    ========================================= */

    reviews: [

        reviewSchema

    ],

    averageRating: {

        type: Number,

        default: 0

    },

    /* =========================================
       STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "active",

            "paused",

            "completed",

            "cancelled"

        ],

        default: "active"

    },

    verified: {

        type: Boolean,

        default: false

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        totalHours: {

            type: Number,

            default: 0

        },

        attendanceRate: {

            type: Number,

            default: 0

        },

        engagementScore: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       TIMESTAMPS
    ========================================= */

    startedAt: {

        type: Date,

        default: Date.now

    },

    completedAt: {

        type: Date,

        default: null

    },

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

mentorshipSchema.index({

    mentor: 1

});

mentorshipSchema.index({

    mentee: 1

});

mentorshipSchema.index({

    category: 1

});

mentorshipSchema.index({

    status: 1

});

/* =========================================================
   VIRTUALS
========================================================= */

mentorshipSchema.virtual("reviewCount")
    .get(function() {

        return this.reviews.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

mentorshipSchema.methods.calculateAverageRating =
    async function() {

        if (

            this.reviews.length === 0

        ) {

            this.averageRating = 0;

        } else {

            const total =
                this.reviews.reduce(

                    (sum, review) =>

                        sum + review.rating,

                    0

                );

            this.averageRating =
                total / this.reviews.length;

        }

        await this.save();

    };

mentorshipSchema.methods.completeSession =
    async function() {

        this.completedSessions += 1;

        await this.save();

    };

mentorshipSchema.methods.completeMentorship =
    async function() {

        this.status = "completed";

        this.completedAt = new Date();

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

mentorshipSchema.statics.getTopMentors =
    async function(limit = 20) {

        return this.find({

            status: "active"

        })

        .sort({

            averageRating: -1

        })

        .limit(limit)

        .populate(

            "mentor",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Mentorship = mongoose.model(

    "Mentorship",

    mentorshipSchema

);

module.exports = Mentorship;
