/* =========================================================
   INCLURA TRANSACTION MODEL
   Enterprise Financial Transaction Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   TRANSACTION SCHEMA
========================================================= */

const transactionSchema = new mongoose.Schema({

    /* =========================================
       TRANSACTION OWNER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        required: true

    },

    /* =========================================
       TRANSACTION IDENTIFICATION
    ========================================= */

    transactionId: {

        type: String,

        required: true,

        unique: true

    },

    reference: {

        type: String,

        required: true,

        unique: true

    },

    /* =========================================
       TRANSACTION TYPE
    ========================================= */

    transactionType: {

        type: String,

        enum: [

            "deposit",

            "withdrawal",

            "transfer",

            "donation",

            "subscription",

            "topup",

            "marketplace",

            "mentorship",

            "care-gig",

            "livestream",

            "emergency",

            "refund"

        ],

        required: true

    },

    /* =========================================
       TRANSACTION CATEGORY
    ========================================= */

    category: {

        type: String,

        enum: [

            "wallet",

            "creator",

            "marketplace",

            "care-services",

            "pay-topup",

            "business",

            "emergency"

        ],

        default: "wallet"

    },

    /* =========================================
       TRANSACTION DETAILS
    ========================================= */

    amount: {

        type: Number,

        required: true

    },

    currency: {

        type: String,

        default: "NGN"

    },

    fee: {

        type: Number,

        default: 0

    },

    netAmount: {

        type: Number,

        default: 0

    },

    description: {

        type: String,

        maxlength: 3000,

        default: ""

    },

    /* =========================================
       TRANSACTION STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "pending",

            "processing",

            "successful",

            "failed",

            "cancelled",

            "reversed"

        ],

        default: "pending"

    },

    /* =========================================
       PAYMENT PROVIDERS
    ========================================= */

    provider: {

        type: String,

        enum: [

            "paystack",

            "flutterwave",

            "vtpass",

            "bank-transfer",

            "wallet"

        ],

        default: "wallet"

    },

    providerReference: {

        type: String,

        default: ""

    },

    /* =========================================
       PAYMENT METHOD
    ========================================= */

    paymentMethod: {

        type: String,

        enum: [

            "card",

            "bank-transfer",

            "wallet",

            "ussd",

            "mobile-money"

        ],

        default: "wallet"

    },

    /* =========================================
       RECEIVER INFORMATION
    ========================================= */

    recipient: {

        user: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User",

            default: null

        },

        wallet: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Wallet",

            default: null

        }

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        voiceReadableSummary: {

            type: Boolean,

            default: true

        },

        screenReaderOptimized: {

            type: Boolean,

            default: true

        },

        readableReceipt: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       FRAUD & SECURITY
    ========================================= */

    security: {

        verified: {

            type: Boolean,

            default: false

        },

        fraudFlagged: {

            type: Boolean,

            default: false

        },

        suspiciousActivity: {

            type: Boolean,

            default: false

        },

        ipAddress: {

            type: String,

            default: ""

        },

        deviceInfo: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        creatorRevenue: {

            type: Boolean,

            default: false

        },

        livestreamRevenue: {

            type: Boolean,

            default: false

        },

        mentorshipRevenue: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       TOP-UP SYSTEM
    ========================================= */

    topup: {

        serviceType: {

            type: String,

            enum: [

                "airtime",

                "data",

                "electricity",

                "education",

                "gaming"

            ],

            default: null

        },

        providerName: {

            type: String,

            default: ""

        },

        phoneNumber: {

            type: String,

            default: ""

        },

        meterNumber: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       FAILURE DETAILS
    ========================================= */

    failureReason: {

        type: String,

        default: ""

    },

    /* =========================================
       TIMESTAMPS
    ========================================= */

    processedAt: {

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

transactionSchema.index({

    user: 1

});

transactionSchema.index({

    wallet: 1

});

transactionSchema.index({

    transactionId: 1

});

transactionSchema.index({

    reference: 1

});

transactionSchema.index({

    status: 1

});

transactionSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

transactionSchema.virtual("isSuccessful")
    .get(function() {

        return this.status === "successful";

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

transactionSchema.methods.markSuccessful =
    async function() {

        this.status = "successful";

        this.processedAt = new Date();

        await this.save();

    };

transactionSchema.methods.markFailed =
    async function(reason) {

        this.status = "failed";

        this.failureReason = reason;

        this.processedAt = new Date();

        await this.save();

    };

transactionSchema.methods.flagFraud =
    async function() {

        this.security.fraudFlagged = true;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

transactionSchema.statics.getUserTransactions =
    async function(

        userId,
        limit = 50

    ) {

        return this.find({

            user: userId

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "user",

            "fullName username"

        );

    };

transactionSchema.statics.getRevenueAnalytics =
    async function() {

        return this.aggregate([

            {

                $match: {

                    status: "successful"

                }

            },

            {

                $group: {

                    _id: "$transactionType",

                    totalRevenue: {

                        $sum: "$amount"

                    },

                    totalTransactions: {

                        $sum: 1

                    }

                }

            }

        ]);

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Transaction = mongoose.model(

    "Transaction",

    transactionSchema

);

module.exports = Transaction;
