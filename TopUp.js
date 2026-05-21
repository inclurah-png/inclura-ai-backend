/* =========================================================
   INCLURA TOP-UP MODEL
   Enterprise Pay & Top-Up Infrastructure
   VTpass Ready Architecture
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   TOP-UP ITEM SCHEMA
========================================================= */

const topUpItemSchema = new mongoose.Schema({

    serviceName: {

        type: String,

        required: true

    },

    serviceCode: {

        type: String,

        required: true

    },

    provider: {

        type: String,

        required: true

    },

    amount: {

        type: Number,

        required: true

    },

    phoneNumber: {

        type: String,

        default: ""

    },

    customerId: {

        type: String,

        default: ""

    }

});

/* =========================================================
   TOP-UP SCHEMA
========================================================= */

const topUpSchema = new mongoose.Schema({

    /* =========================================
       USER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       WALLET & TRANSACTION
    ========================================= */

    wallet: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Wallet",

        required: true

    },

    transaction: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Transaction",

        default: null

    },

    /* =========================================
       TOP-UP IDENTIFICATION
    ========================================= */

    reference: {

        type: String,

        required: true,

        unique: true

    },

    /* =========================================
       SERVICE CATEGORY
    ========================================= */

    category: {

        type: String,

        enum: [

            "airtime",

            "data",

            "electricity",

            "education",

            "gaming"

        ],

        required: true

    },

    /* =========================================
       VT PASS SUPPORTED SERVICES
    ========================================= */

    serviceType: {

        type: String,

        enum: [

            /* Airtime */

            "mtn-airtime-vtu",

            "airtel-airtime-vtu",

            "glo-airtime-vtu",

            "9mobile-airtime-vtu",

            "smile-airtime-vtu",

            "t2-airtime-vtu",

            "international-airtime",

            /* Data */

            "mtn-data",

            "airtel-data",

            "glo-data",

            "9mobile-sme-data",

            "smile-data",

            "t2-data",

            "glo-best-value",

            /* Bills */

            "electricity-bill",

            "education-payment",

            /* Gaming */

            "gaming-topup",

            "gaming-subscription",

            "gaming-voucher"

        ],

        required: true

    },

    /* =========================================
       TOP-UP ITEM
    ========================================= */

    item: topUpItemSchema,

    /* =========================================
       PRICING
    ========================================= */

    amount: {

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

    serviceFee: {

        type: Number,

        default: 0

    },

    totalAmount: {

        type: Number,

        default: 0

    },

    /* =========================================
       PAYMENT PROVIDER
    ========================================= */

    provider: {

        type: String,

        enum: [

            "vtpass",

            "wallet"

        ],

        default: "vtpass"

    },

    providerReference: {

        type: String,

        default: ""

    },

    /* =========================================
       STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "pending",

            "processing",

            "successful",

            "failed",

            "cancelled"

        ],

        default: "pending"

    },

    failureReason: {

        type: String,

        default: ""

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

        accessiblePaymentFlow: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       RETRY SYSTEM
    ========================================= */

    retryCount: {

        type: Number,

        default: 0

    },

    maxRetries: {

        type: Number,

        default: 3

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        processingTime: {

            type: Number,

            default: 0

        },

        successfulRetries: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       SECURITY
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

        }

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

topUpSchema.index({

    user: 1

});

topUpSchema.index({

    reference: 1

});

topUpSchema.index({

    category: 1

});

topUpSchema.index({

    serviceType: 1

});

topUpSchema.index({

    status: 1

});

topUpSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

topUpSchema.virtual("isSuccessful")
    .get(function() {

        return this.status === "successful";

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

topUpSchema.methods.markSuccessful =
    async function() {

        this.status = "successful";

        this.processedAt = new Date();

        await this.save();

    };

topUpSchema.methods.markFailed =
    async function(reason) {

        this.status = "failed";

        this.failureReason = reason;

        this.retryCount += 1;

        await this.save();

    };

topUpSchema.methods.canRetry =
    function() {

        return this.retryCount < this.maxRetries;

    };

/* =========================================================
   STATIC METHODS
========================================================= */

topUpSchema.statics.getUserTopUps =
    async function(userId, limit = 50) {

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

topUpSchema.statics.getSuccessfulTopUps =
    async function(limit = 100) {

        return this.find({

            status: "successful"

        })

        .sort({

            createdAt: -1

        })

        .limit(limit);

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const TopUp = mongoose.model(

    "TopUp",

    topUpSchema

);

module.exports = TopUp;
