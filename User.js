/* =========================================================
   INCLURA USER MODEL
   Enterprise User Schema
   ========================================================= */

const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema = new mongoose.Schema({

    /* =========================================
       BASIC INFORMATION
    ========================================= */

    fullName: {

        type: String,

        required: true,

        trim: true,

        maxlength: 100

    },

    username: {

        type: String,

        required: true,

        unique: true,

        trim: true,

        lowercase: true,

        minlength: 3,

        maxlength: 30

    },

    email: {

        type: String,

        required: true,

        unique: true,

        lowercase: true,

        trim: true

    },

    phone: {

        type: String,

        default: ""

    },

    password: {

        type: String,

        required: true,

        minlength: 6,

        select: false

    },

    /* =========================================
       USER ROLE SYSTEM
    ========================================= */

    role: {

        type: String,

        enum: [

            "user",

            "creator",

            "mentor",

            "business",

            "admin"

        ],

        default: "user"

    },

    /* =========================================
       PROFILE INFORMATION
    ========================================= */

    profilePhoto: {

        type: String,

        default: ""

    },

    coverPhoto: {

        type: String,

        default: ""

    },

    bio: {

        type: String,

        maxlength: 500,

        default: ""

    },

    location: {

        type: String,

        default: ""

    },

    website: {

        type: String,

        default: ""

    },

    /* =========================================
       ACCESSIBILITY SETTINGS
    ========================================= */

    accessibility: {

        screenReader: {

            type: Boolean,

            default: false

        },

        voiceNavigation: {

            type: Boolean,

            default: false

        },

        captionsEnabled: {

            type: Boolean,

            default: true

        },

        highContrast: {

            type: Boolean,

            default: false

        },

        reducedMotion: {

            type: Boolean,

            default: false

        },

        keyboardNavigation: {

            type: Boolean,

            default: true

        },

        fontScaling: {

            type: Boolean,

            default: false

        },

        signLanguageSupport: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       SOCIAL FEATURES
    ========================================= */

    followers: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    following: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    savedPosts: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Post"

        }

    ],

    taggedPosts: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Post"

        }

    ],

    /* =========================================
       CREATOR FEATURES
    ========================================= */

    creatorProfile: {

        verified: {

            type: Boolean,

            default: false

        },

        monetized: {

            type: Boolean,

            default: false

        },

        totalEarnings: {

            type: Number,

            default: 0

        },

        livestreamEnabled: {

            type: Boolean,

            default: false

        },

        marketplaceEnabled: {

            type: Boolean,

            default: false

        }

    },

    /* =========================================
       ACCOUNT STATUS
    ========================================= */

    accountStatus: {

        type: String,

        enum: [

            "active",

            "suspended",

            "banned"

        ],

        default: "active"

    },

    verified: {

        type: Boolean,

        default: false

    },

    banned: {

        type: Boolean,

        default: false

    },

    /* =========================================
       SECURITY
    ========================================= */

    lastLogin: {

        type: Date

    },

    loginAttempts: {

        type: Number,

        default: 0

    },

    passwordChangedAt: {

        type: Date

    },

    refreshToken: {

        type: String,

        default: ""

    },

    /* =========================================
       NOTIFICATIONS
    ========================================= */

    notificationsEnabled: {

        type: Boolean,

        default: true

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
   PASSWORD HASHING
========================================================= */

userSchema.pre(

    "save",

    async function(next) {

        if (!this.isModified("password")) {

            return next();

        }

        const salt =
            await bcrypt.genSalt(10);

        this.password =
            await bcrypt.hash(

                this.password,

                salt

            );

        next();

    }

);

/* =========================================================
   PASSWORD COMPARISON
========================================================= */

userSchema.methods.comparePassword =
    async function(password) {

        return await bcrypt.compare(

            password,

            this.password

        );

    };

/* =========================================================
   GENERATE JWT TOKEN
========================================================= */

userSchema.methods.generateToken =
    function() {

        return jwt.sign(

            {

                id: this._id,

                role: this.role

            },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d"

            }

        );

    };

/* =========================================================
   GENERATE REFRESH TOKEN
========================================================= */

userSchema.methods.generateRefreshToken =
    function() {

        return jwt.sign(

            {

                id: this._id

            },

            process.env.JWT_REFRESH_SECRET,

            {

                expiresIn: "30d"

            }

        );

    };

/* =========================================================
   ACCESSIBILITY HELPER
========================================================= */

userSchema.methods.getAccessibilityPreferences =
    function() {

        return this.accessibility;

    };

/* =========================================================
   PUBLIC PROFILE RESPONSE
========================================================= */

userSchema.methods.toPublicProfile =
    function() {

        return {

            id: this._id,

            fullName: this.fullName,

            username: this.username,

            profilePhoto: this.profilePhoto,

            bio: this.bio,

            role: this.role,

            verified: this.verified

        };

    };

/* =========================================================
   USER ANALYTICS
========================================================= */

userSchema.virtual("followersCount")
    .get(function() {

        return this.followers.length;

    });

userSchema.virtual("followingCount")
    .get(function() {

        return this.following.length;

    });

/* =========================================================
   EXPORT MODEL
========================================================= */

const User = mongoose.model(

    "User",

    userSchema

);

module.exports = User;
