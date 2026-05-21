/* =========================================================
   INCLURA POST CONTROLLER
   Enterprise Social Post Logic
   ========================================================= */

const Post = require("../models/Post");

const User = require("../models/User");

/* =========================================================
   CREATE POST
========================================================= */

exports.createPost =
    async (req, res) => {

        try {

            const {

                caption,

                media,

                hashtags,

               
