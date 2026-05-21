/* =========================================================
   INCLURA MARKETPLACE MODEL
   Enterprise Marketplace Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   REVIEW SCHEMA
========================================================= */

const reviewSchema = new mongoose.Schema({

    user: {

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
   MARKETPLACE SCHEMA
========================================================= */

const marketplaceSchema = new mongoose.Schema({

    /* =========================================
       SELLER
    ========================================= */

    seller: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       LISTING DETAILS
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

            "digital-product",

            "physical-product",

            "service",

            "creator-item",

            "business-service",

            "care-gig",

            "mentorship",

            "accessibility-service"

        ],

        default: "digital-product"

    },

    listingType: {

        type: String,

        enum: [

            "product",

            "service"

        ],

        default: "product"

    },

    /* =========================================
       MEDIA
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

                ],

                default: "image"

            }

        }

    ],

    thumbnail: {

        type: String,

        default: ""

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        altText: {

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

        },

        captions: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       PRICING
    ========================================= */

    price: {

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

    discountPrice: {

        type: Number,

        default: 0

    },

    negotiable: {

        type: Boolean,

        default: false

    },

    /* =========================================
       INVENTORY
    ========================================= */

    stock: {

        type: Number,

        default: 0

    },

    unlimitedStock: {

        type: Boolean,

        default: false

    },

    soldCount: {

        type: Number,

        default: 0

    },

    /* =========================================
       DELIVERY
    ========================================= */

    deliveryType: {

        type: String,

        enum: [

            "digital",

            "physical",

            "service"

        ],

        default: "digital"

    },

    deliveryTime: {

        type: String,

        default: ""

    },

    /* =========================================
       FINANCIAL INTEGRATION
    ========================================= */

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        default: null

    },

    totalRevenue: {

        type: Number,

        default: 0

    },

    /* =========================================
       SOCIAL FEATURES
    ========================================= */

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

    reviews: [

        reviewSchema

    ],

    averageRating: {

        type: Number,

        default: 0

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        views: {

            type: Number,

            default: 0

        },

        clicks: {

            type: Number,

            default: 0

        },

        conversions: {

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

            default: false

        },

        rejected: {

            type: Boolean,

            default: false

        },

        reported: {

            type: Boolean,

            default: false

        },

        fraudFlagged: {

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

            "draft",

            "active",

            "paused",

            "sold-out",

            "removed"

        ],

        default: "draft"

    },

    featured: {

        type: Boolean,

        default: false

    },

    verified: {

        type: Boolean,

        default: false

    },

    /* =========================================
       LOCATION
    ========================================= */

    location: {

        type: String,

        default: ""

    },

    /* =========================================
       TAGS
    ========================================= */

    tags: [

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

marketplaceSchema.index({

    seller: 1

});

marketplaceSchema.index({

    category: 1

});

marketplaceSchema.index({

    status: 1

});

marketplaceSchema.index({

    featured: 1

});

marketplaceSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

marketplaceSchema.virtual("reviewCount")
    .get(function() {

        return this.reviews.length;

    });

marketplaceSchema.virtual("saveCount")
    .get(function() {

        return this.saves.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

marketplaceSchema.methods.incrementViews =
    async function() {

        this.analytics.views += 1;

        await this.save();

    };

marketplaceSchema.methods.incrementSales =
    async function(quantity = 1) {

        this.soldCount += quantity;

        if (!this.unlimitedStock) {

            this.stock -= quantity;

            if (this.stock <= 0) {

                this.status = "sold-out";

            }

        }

        await this.save();

    };

marketplaceSchema.methods.calculateAverageRating =
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

/* =========================================================
   STATIC METHODS
========================================================= */

marketplaceSchema.statics.getFeaturedListings =
    async function(limit = 20) {

        return this.find({

            featured: true,

            status: "active"

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "seller",

            "fullName username profilePhoto verified"

        );

    };

marketplaceSchema.statics.getTrendingListings =
    async function(limit = 20) {

        return this.find({

            status: "active"

        })

        .sort({

            "analytics.views": -1

        })

        .limit(limit)

        .populate(

            "seller",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Marketplace = mongoose.model(

    "Marketplace",

    marketplaceSchema

);

module.exports = Marketplace;
