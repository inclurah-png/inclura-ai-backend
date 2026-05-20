/* =========================================================
   INCLURA REEL MODEL
   Enterprise Short Video Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   REEL COMMENT SCHEMA
========================================================= */

const reelCommentSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    comment: {

        type: String,

        required: true,

        maxlength: 1000

    },

    likes: [

        {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User"

        }

    ],

    accessibility: {

        voiceReadable: {

            type: Boolean,

            default: true

        }

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

/* =========================================================
   REEL SCHEMA
========================================================= */

const reelSchema = new mongoose.Schema({

    /* =========================================
       REEL CREATOR
    ========================================= */

    creator: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    /* =========================================
       REEL CONTENT
    ========================================= */

    caption: {

        type: String,

        maxlength: 3000,

        default: ""

    },

    /* =========================================
       VIDEO INFORMATION
    ========================================= */

    videoUrl: {

        type: String,
