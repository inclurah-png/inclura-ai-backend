/* =========================================================
   INCLURA CARE-GIG MODEL
   Enterprise Care Services Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   REVIEW SCHEMA
========================================================= */

const reviewSchema = new mongoose.Schema({

    reviewer: {

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

        maxlength: 3000,

        default: ""

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   BOOKING SCHEMA
========================================================= */

const bookingSchema = new mongoose.Schema({

    client: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    bookingDate: {

        type: Date,

        required: true

    },

    durationHours: {

        type: Number,

        default: 1

    },

    status: {

        type: String,

        enum: [

            "pending",

            "accepted",

            "ongoing",

            "completed",

            "cancelled"

        ],

        default: "pending"

    },

    amount: {

        type: Number,

        default: 0

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   CARE-GIG SCHEMA
========================================================= */

const careGigSchema = new mongoose.Schema({

    /* =========================================
       CARE WORKER
    ========================================= */

    caregiver: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       SERVICE DETAILS
    ========================================= */

    title: {

        type: String,

        required: true,

        maxlength: 200

    },

    description: {

        type: String,

        required: true,

        maxlength: 10000

    },

    category: {

        type: String,

        enum: [

            "elderly-care",

            "disability-support",

            "mobility-assistance",

            "medical-support",

            "home-care",

            "mental-health-support",

            "accessibility-support",

            "child-care"

        ],

        default: "home-care"

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        accessibilityCertified: {

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

        wheelchairSupport: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       PRICING
    ========================================= */

    hourlyRate: {

        type: Number,

        required: true

    },

        /* =========================================
       PRICING
    ========================================= */

    hourlyRate: {

        type: Number,

        required: true

    },

    currency: {

        type: String,

        enum: [

            "NGN",

            "USD",

            "GBP",

            "EUR"

        ],

        default: "NGN"

    },

    minimumHours: {

        type: Number,

        default: 1

    },

    },

    minimumHours: {

        type: Number,

        default: 1

    },

    /* =========================================
       PLATFORM COMMISSION
    ========================================= */

    commission: {

        percentageCharge: {

            type: Number,

            default: 10
        },

        totalCommissionEarned: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       CAREGIVER EARNINGS
    ========================================= */

    earnings: {

        totalEarnings: {

            type: Number,

            default: 0

        },

        pendingPayouts: {

            type: Number,

            default: 0

        },

        completedPayouts: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       WALLET INTEGRATION
    ========================================= */

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        default: null

    },

    /* =========================================
       BOOKINGS
    ========================================= */

    bookings: [

        bookingSchema

    ],

    totalBookings: {

        type: Number,

        default: 0

    },

    completedBookings: {

        type: Number,

        default: 0

    },

    /* =========================================
       AVAILABILITY
    ========================================= */

    availability: {

        availableNow: {

            type: Boolean,

            default: true

        },

        availableDays: [

            {

                type: String

            }

        ],

        availableHours: {

            start: {

                type: String,

                default: ""

            },

            end: {

                type: String,

                default: ""

            }

        }

    },

    /* =========================================
       LOCATION
    ========================================= */

    location: {

        city: {

            type: String,

            default: ""

        },

        state: {

            type: String,

            default: ""

        },

        country: {

            type: String,

            default: ""

        },

        remoteSupport: {

            type: Boolean,

            default: false

        }

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
       EMERGENCY SUPPORT
    ========================================= */

    emergencySupport: {

        urgentRequestsEnabled: {

            type: Boolean,

            default: false

        },

        emergencyAvailable: {

            type: Boolean,

            default: false

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

        totalClients: {

            type: Number,

            default: 0

        },

        responseRate: {

            type: Number,

            default: 0

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

            "suspended",

            "completed"

        ],

        default: "active"

    },

    verified: {

        type: Boolean,

        default: false

    },

    featured: {

        type: Boolean,

        default: false

    },

    /* =========================================
       MEDIA
    ========================================= */

    profileImage: {

        type: String,

        default: ""

    },

    certificates: [

        {

            type: String

        }

    ],

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

careGigSchema.index({

    caregiver: 1

});

careGigSchema.index({

    category: 1

});

careGigSchema.index({

    status: 1

});

careGigSchema.index({

    featured: 1

});

careGigSchema.index({

    averageRating: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

careGigSchema.virtual("reviewCount")
    .get(function() {

        return this.reviews.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

careGigSchema.methods.calculateAverageRating =
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

careGigSchema.methods.calculateCommission =
    function(amount) {

        return (

            amount *

            (this.commission.percentageCharge / 100)

        );

    };

careGigSchema.methods.incrementBookings =
    async function() {

        this.totalBookings += 1;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

careGigSchema.statics.getTopCaregivers =
    async function(limit = 20) {

        return this.find({

            status: "active"

        })

        .sort({

            averageRating: -1

        })

        .limit(limit)

        .populate(

            "caregiver",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const CareGig = mongoose.model(

    "CareGig",

    careGigSchema

);

module.exports = CareGig;
