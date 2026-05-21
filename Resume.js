/* =========================================================
   INCLURA RESUME MODEL
   Enterprise Career & Portfolio Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   EXPERIENCE SCHEMA
========================================================= */

const experienceSchema = new mongoose.Schema({

    company: {

        type: String,

        required: true

    },

    position: {

        type: String,

        required: true

    },

    employmentType: {

        type: String,

        enum: [

            "full-time",

            "part-time",

            "contract",

            "freelance",

            "internship",

            "remote"

        ],

        default: "full-time"

    },

    location: {

        type: String,

        default: ""

    },

    currentlyWorking: {

        type: Boolean,

        default: false

    },

    startDate: {

        type: Date,

        required: true

    },

    endDate: {

        type: Date,

        default: null

    },

    description: {

        type: String,

        maxlength: 5000,

        default: ""

    }

});

/* =========================================================
   EDUCATION SCHEMA
========================================================= */

const educationSchema = new mongoose.Schema({

    institution: {

        type: String,

        required: true

    },

    degree: {

        type: String,

        required: true

    },

    fieldOfStudy: {

        type: String,

        default: ""

    },

    startDate: {

        type: Date,

        required: true

    },

    endDate: {

        type: Date,

        default: null

    },

    currentlyStudying: {

        type: Boolean,

        default: false

    },

    description: {

        type: String,

        maxlength: 3000,

        default: ""

    }

});

/* =========================================================
   CERTIFICATION SCHEMA
========================================================= */

const certificationSchema = new mongoose.Schema({

    name: {

        type: String,

        required: true

    },

    issuingOrganization: {

        type: String,

        required: true

    },

    issueDate: {

        type: Date,

        required: true

    },

    expirationDate: {

        type: Date,

        default: null

    },

    credentialUrl: {

        type: String,

        default: ""

    }

});

/* =========================================================
   SOCIAL LINK SCHEMA
========================================================= */

const socialLinkSchema = new mongoose.Schema({

    platform: {

        type: String,

        enum: [

            "linkedin",

            "github",

            "twitter",

            "instagram",

            "youtube",

            "portfolio",

            "website",

            "inclura"

        ],

        required: true

    },

    url: {

        type: String,

        required: true

    }

});

/* =========================================================
   RESUME SCHEMA
========================================================= */

const resumeSchema = new mongoose.Schema({

    /* =========================================
       USER
    ========================================= */

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        unique: true

    },

    /* =========================================
       BASIC INFORMATION
    ========================================= */

    fullName: {

        type: String,

        required: true

    },

    professionalTitle: {

        type: String,

        default: ""

    },

    bio: {

        type: String,

        maxlength: 5000,

        default: ""

    },

    profilePhoto: {

        type: String,

        default: ""

    },

    /* =========================================
       CONTACT INFORMATION
    ========================================= */

    email: {

        type: String,

        required: true

    },

    phoneNumber: {

        type: String,

        default: ""

    },

    website: {

        type: String,

        default: ""

    },

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

        remoteWork: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       EXPERIENCE
    ========================================= */

    experiences: [

        experienceSchema

    ],

    /* =========================================
       EDUCATION
    ========================================= */

    education: [

        educationSchema

    ],

    /* =========================================
       CERTIFICATIONS
    ========================================= */

    certifications: [

        certificationSchema

    ],

    /* =========================================
       SKILLS
    ========================================= */

    skills: [

        {

            type: String

        }

    ],

    /* =========================================
       LANGUAGES
    ========================================= */

    languages: [

        {

            language: {

                type: String

            },

            proficiency: {

                type: String,

                enum: [

                    "beginner",

                    "intermediate",

                    "advanced",

                    "native"

                ],

                default: "beginner"

            }

        }

    ],

    /* =========================================
       CREATOR PORTFOLIO
    ========================================= */

    creatorPortfolio: {

        enabled: {

            type: Boolean,

            default: false

        },

        reels: [

            {

                type: mongoose.Schema.Types.ObjectId,

                ref: "Reel"

            }

        ],

        livestreams: [

            {

                type: mongoose.Schema.Types.ObjectId,

                ref: "Livestream"

            }

        ],

        portfolioMedia: [

            {

                type: String

            }

        ]

    },

    /* =========================================
       SOCIAL LINKS
    ========================================= */

    socialLinks: [

        socialLinkSchema

    ],

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        screenReaderOptimized: {

            type: Boolean,

            default: true

        },

        voiceReadable: {

            type: Boolean,

            default: true

        },

        accessibleFormatting: {

            type: Boolean,

            default: true

        }

    },

    /* =========================================
       CAREER PREFERENCES
    ========================================= */

    careerPreferences: {

        openToWork: {

            type: Boolean,

            default: true

        },

        preferredRoles: [

            {

                type: String

            }

        ],

        salaryExpectation: {

            amount: {

                type: Number,

                default: 0

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

            }

        }

    },

    /* =========================================
       VISIBILITY
    ========================================= */

    visibility: {

        type: String,

        enum: [

            "public",

            "private",

            "recruiters-only"

        ],

        default: "public"

    },

    downloadable: {

        type: Boolean,

        default: true

    },

    verified: {

        type: Boolean,

        default: false

    },

    /* =========================================
       ANALYTICS
    ========================================= */

    analytics: {

        profileViews: {

            type: Number,

            default: 0

        },

        recruiterViews: {

            type: Number,

            default: 0

        },

        downloads: {

            type: Number,

            default: 0

        }

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

resumeSchema.index({

    user: 1

});

resumeSchema.index({

    professionalTitle: 1

});

resumeSchema.index({

    visibility: 1

});

resumeSchema.index({

    skills: 1

});

/* =========================================================
   VIRTUALS
========================================================= */

resumeSchema.virtual("experienceCount")
    .get(function() {

        return this.experiences.length;

    });

resumeSchema.virtual("educationCount")
    .get(function() {

        return this.education.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

resumeSchema.methods.incrementViews =
    async function() {

        this.analytics.profileViews += 1;

        await this.save();

    };

resumeSchema.methods.incrementDownloads =
    async function() {

        this.analytics.downloads += 1;

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

resumeSchema.statics.getPublicResumes =
    async function(limit = 20) {

        return this.find({

            visibility: "public"

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "user",

            "username profilePhoto verified"

        );

    };

resumeSchema.statics.searchBySkill =
    async function(skill) {

        return this.find({

            skills: {

                $regex: skill,

                $options: "i"

            },

            visibility: "public"

        });

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Resume = mongoose.model(

    "Resume",

    resumeSchema

);

module.exports = Resume;
