/* =========================================================
   INCLURA CONVERSATION MODEL
   Enterprise Conversation Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   PARTICIPANT SETTINGS SCHEMA
========================================================= */

const participantSettingsSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    muted: {

        type: Boolean,

        default: false

    },

    archived: {

        type: Boolean,

        default: false

    },

    blocked: {

        type: Boolean,

        default: false

    },

    unreadCount: {

        type: Number,

        default: 0

    },

    accessibility: {

        screenReaderOptimized: {

            type: Boolean,

            default: true

        },

        voiceNavigationEnabled: {

            type: Boolean,

            default: false

        }

    }

});

/* =========================================================
   CONVERSATION SCHEMA
========================================================= */

const conversationSchema = new mongoose.Schema({

    /* =========================================
       PARTICIPANTS
    ========================================= */

    participants: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true

        }

    ],

    /* =========================================
       CONVERSATION TYPE
    ========================================= */

    conversationType: {

        type: String,

        enum: [

            "direct",

            "creator",

            "mentor",

            "business",

            "emergency",

            "group"

        ],

        default: "direct"

    },

    /* =========================================
       CONVERSATION NAME
    ========================================= */

    name: {

        type: String,

        default: ""

    },

    /* =========================================
       CONVERSATION PHOTO
    ========================================= */

    photo: {

        type: String,

        default: ""

    },

    /* =========================================
       LAST MESSAGE
    ========================================= */

    lastMessage: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Message",

        default: null

    },

    lastMessageText: {

        type: String,

        default: ""

    },

    lastMessageAt: {

        type: Date,

        default: Date.now

    },

    /* =========================================
       TYPING INDICATORS
    ========================================= */

    typingUsers: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    /* =========================================
       PARTICIPANT SETTINGS
    ========================================= */

    participantSettings: [

        participantSettingsSchema

    ],

    /* =========================================
      
