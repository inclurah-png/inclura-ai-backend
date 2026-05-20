/* =========================================================
   INCLURA WALLET MODEL
   Enterprise Financial Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   WALLET SCHEMA
========================================================= */

const walletSchema = new mongoose.Schema({

    /* =========================================
       WALLET OWNER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        unique: true

    },

    /* =========================================
       WALLET IDENTIFICATION
    ========================================= */

    walletId: {

        type: String,

        required: true,

        unique: true

    },

    currency: {

        type: String,

        default: "NGN"

    },

    /* =========================================
       WALLET BALANCES
    ========================================= */

    availableBalance: {

        type: Number,

        default: 0

    },

    pendingBalance: {

        type: Number,

        default: 0

    },

    withdrawnBalance: {

        type: Number,

        default: 0

    },

    totalEarnings: {

        type: Number,

        default: 0

    },

    totalDeposits: {

        type: Number,

        default: 0

    },

    totalWithdrawals: {

        type: Number,

        default: 0

    },

    /* =========================================
       MONETIZATION FEATURES
    ========================================= */

    creatorMonetization: {

        enabled: {

            type: Boolean,

            default: false

        },

        livestreamDonations: {

            type: Number,

            default: 0

        },

        subscriptions: {

            type: Number,

            default: 0

        },

        premiumContentRevenue: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       PAYMENT FEATURES
    ========================================= */

    payments: {

        mentorshipPayments: {

            type: Number,

            default: 0

        },

        marketplacePayments: {

            type: Number,

            default: 0

        },

        careGigPayments: {

            type: Number,

            default: 0

        },

        emergencySupportFunds: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       BANKING DETAILS
    ========================================= */

    bankDetails: {

        bankName: {

            type: String,

            default: ""

        },

        accountName: {

            type: String,

            default: ""

        },

        accountNumber: {

            type: String,

            default: ""

        },

        bankCode: {

            type: String,

            default: ""

        }

    },

    /* =========================================
       SECURITY
    ========================================= */

    security: {

        walletLocked: {

            type: Boolean,

            default: false

        },

        transactionPin: {

            type: String,

            select: false,

            default: ""

        },

        fraudFlagged: {

            type: Boolean,

            default: false

        },

        lastTransactionAt: {

            type: Date,

            default: null

        }

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        voiceReadableBalances: {

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
       ANALYTICS
    ========================================= */

    analytics: {

        totalTransactions: {

            type: Number,

            default: 0

        },

        successfulTransactions: {

            type: Number,

            default: 0

        },

        failedTransactions: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       WALLET STATUS
    ========================================= */

    status: {

        type: String,

        enum: [

            "active",

            "suspended",

            "restricted"

        ],

        default: "active"

    },

    verified: {

        type: Boolean,

        default: false

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

walletSchema.index({

    user: 1

});

walletSchema.index({

    walletId: 1

});

walletSchema.index({

    status: 1

});

/* =========================================================
   VIRTUALS
========================================================= */

walletSchema.virtual("totalBalance")
    .get(function() {

        return (

            this.availableBalance +

            this.pendingBalance

        );

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

walletSchema.methods.creditWallet =
    async function(amount) {

        this.availableBalance += amount;

        this.totalDeposits += amount;

        this.analytics.totalTransactions += 1;

        this.analytics.successfulTransactions += 1;

        this.security.lastTransactionAt =
            new Date();

        await this.save();

    };

walletSchema.methods.debitWallet =
    async function(amount) {

        if (

            this.availableBalance < amount

        ) {

            throw new Error(

                "Insufficient wallet balance"

            );

        }

        this.availableBalance -= amount;

        this.totalWithdrawals += amount;

        this.withdrawnBalance += amount;

        this.analytics.totalTransactions += 1;

        this.analytics.successfulTransactions += 1;

        this.security.lastTransactionAt =
            new Date();

        await this.save();

    };

walletSchema.methods.lockWallet =
    async function() {

        this.security.walletLocked = true;

        await this.save();

    };

walletSchema.methods.unlockWallet =
    async function() {

        this.security.walletLocked = false;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

walletSchema.statics.getTopCreators =
    async function(limit = 20) {

        return this.find({

            "creatorMonetization.enabled": true

        })

        .sort({

            totalEarnings: -1

        })

        .limit(limit)

        .populate(

            "user",

            "fullName username profilePhoto verified"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Wallet = mongoose.model(

    "Wallet",

    walletSchema

);

module.exports = Wallet;
