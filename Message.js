/* =========================================================
   INCLURA MESSAGE MODEL
   Enterprise Realtime Messaging Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   MESSAGE REACTION SCHEMA
========================================================= */

const reactionSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    reaction: {

        type: String,

        enum: [

            "like",

            "love",

            "laugh",

            "wow",

            "sad",

            "fire"

        ],

        default: "like"

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   MESSAGE SCHEMA
========================================================= */

const messageSchema = new mongoose.Schema({

    /* =========================================
       CONVERSATION
    ========================================= */

    conversationId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Conversation",

        required: true

    },

    /* =========================================
       SENDER
    ========================================= */

    sender: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       RECEIVER
    ========================================= */

    receiver: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       MESSAGE TYPE
    ========================================= */

    messageType: {

        type: String,

        enum: [

            "text",

            "image",

            "video",

            "voice",

            "document",

            "system"

        ],

        default: "text"

    },

    /* =========================================
       MESSAGE CONTENT
    ========================================= */

    content: {

        type: String,

        default: "",

        maxlength: 5000

    },

    /* =========================================
       MEDIA FILES
    ========================================= */

    media: {

        url: {

            type: String,

            default: ""

        },

        thumbnail: {

            type: String,

            default: ""

        },

        fileName: {

            type: String,

            default: ""

        },

        fileSize: {

            type: Number,

            default: 0

        },

        duration: {

            type: Number,

            default: 0

        }

    },

    /* =========================================
       ACCESSIBILITY
    ========================================= */

    accessibility: {

        captions: {

            type: String,

            default: ""

        },

        transcript: {

            type: String,

            default: ""

        },

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

        }

    },

    /* =========================================
       MESSAGE STATUS
    ========================================= */

    delivered: {

        type: Boolean,

        default: false

    },

    deliveredAt: {

        type: Date

    },

    seen: {

        type: Boolean,

        default: false

    },

    seenAt: {

        type: Date

    },

    edited: {

        type: Boolean,

        default: false

    },

    editedAt: {

        type: Date

    },

    /* =========================================
       REPLY SYSTEM
    ========================================= */

    replyTo: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Message",

        default: null

    },

    /* =========================================
       REACTIONS
    ========================================= */

    reactions: [

        reactionSchema

    ],

    /* =========================================
       PINNED MESSAGE
    ========================================= */

    pinned: {

        type: Boolean,

        default: false

    },

    /* =========================================
       MESSAGE SECURITY
    ========================================= */

    encrypted: {

        type: Boolean,

        default: false

    },

    flagged: {

        type: Boolean,

        default: false

    },

    deleted: {

        type: Boolean,

        default: false

    },

    /* =========================================
       MESSAGE CATEGORY
    ========================================= */

    category: {

        type: String,

        enum: [

            "normal",

            "mentor",

            "business",

            "emergency",

            "creator"

        ],

        default: "normal"

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

messageSchema.index({

    conversationId: 1

});

messageSchema.index({

    sender: 1

});

messageSchema.index({

    receiver: 1

});

messageSchema.index({

    createdAt: -1

});

/* =========================================================
   VIRTUALS
========================================================= */

messageSchema.virtual("reactionCount")
    .get(function() {

        return this.reactions.length;

    });

/* =========================================================
   INSTANCE METHODS
========================================================= */

messageSchema.methods.markAsDelivered =
    async function() {

        this.delivered = true;

        this.deliveredAt = new Date();

        await this.save();

    };

messageSchema.methods.markAsSeen =
    async function() {

        this.seen = true;

        this.seenAt = new Date();

        await this.save();

    };

messageSchema.methods.editMessage =
    async function(newContent) {

        this.content = newContent;

        this.edited = true;

        this.editedAt = new Date();

        await this.save();

    };

/* =========================================================
   STATIC METHODS
========================================================= */

messageSchema.statics.getConversationMessages =
    async function(

        conversationId,
        limit = 50

    ) {

        return this.find({

            conversationId,

            deleted: false

        })

        .sort({

            createdAt: -1

        })

        .limit(limit)

        .populate(

            "sender",

            "fullName username profilePhoto"

        )

        .populate(

            "receiver",

            "fullName username profilePhoto"

        );

    };

/* =========================================================
   EXPORT MODEL
========================================================= */

const Message = mongoose.model(

    "Message",

    messageSchema

);

module.exports = Message;
