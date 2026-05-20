/* =========================================================
   INCLURA MONGODB CONNECTION
   Enterprise MongoDB Infrastructure
   ========================================================= */

const mongoose = require("mongoose");

/* =========================================================
   MONGODB CONNECTION FUNCTION
========================================================= */

const connectMongoDB = async () => {

    try {

        const mongoURI =
            process.env.MONGODB_URI;

        if (!mongoURI) {

            throw new Error(
                "MONGODB_URI not found in environment variables"
            );

        }

        /* =========================================
           MONGOOSE CONFIGURATION
        ========================================= */

        mongoose.set("strictQuery", true);

        /* =========================================
           DATABASE CONNECTION
        ========================================= */

        const connection = await mongoose.connect(

            mongoURI,

            {

                autoIndex: true,

                maxPoolSize: 20,

                minPoolSize: 5,

                socketTimeoutMS: 45000,

                serverSelectionTimeoutMS: 5000,

                family: 4

            }

        );

        console.log(`
        ============================================
              MONGODB CONNECTED SUCCESSFULLY
        ============================================

        Database Host:
        ${connection.connection.host}

        Database Name:
        ${connection.connection.name}

        MongoDB Ready For:
        - Posts
        - Reels
        - Comments
        - Feeds
        - Livestream Chats
        - Tagged Content

        ============================================
        `);

        /* =========================================
           CONNECTION EVENTS
        ========================================= */

        mongoose.connection.on(

            "connected",

            () => {

                console.log(
                    "MongoDB connection established"
                );

            }

        );

        mongoose.connection.on(

            "error",

            (error) => {

                console.error(
                    "MongoDB connection error:",
                    error
                );

            }

        );

        mongoose.connection.on(

            "disconnected",

            () => {

                console.warn(
                    "MongoDB disconnected"
                );

            }

        );

        mongoose.connection.on(

            "reconnected",

            () => {

                console.log(
                    "MongoDB reconnected"
                );

            }

        );

        /* =========================================
           PROCESS TERMINATION
        ========================================= */

        process.on(

            "SIGINT",

            async () => {

                await mongoose.connection.close();

                console.log(
                    "MongoDB connection closed due to app termination"
                );

                process.exit(0);

            }

        );

    } catch(error) {

        console.error(`
        ============================================
               MONGODB CONNECTION FAILED
        ============================================

        ${error.message}

        ============================================
        `);

        process.exit(1);

    }

};

/* =========================================================
   CONNECTION HEALTH CHECK
========================================================= */

const checkMongoHealth = () => {

    const state = mongoose.connection.readyState;

    switch(state) {

        case 0:
            return "Disconnected";

        case 1:
            return "Connected";

        case 2:
            return "Connecting";

        case 3:
            return "Disconnecting";

        default:
            return "Unknown";

    }

};

/* =========================================================
   DATABASE METRICS
========================================================= */

const getMongoMetrics = () => {

    return {

        host:
            mongoose.connection.host,

        name:
            mongoose.connection.name,

        readyState:
            mongoose.connection.readyState,

        collections:
            Object.keys(
                mongoose.connection.collections
            )

    };

};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = connectMongoDB;

module.exports.checkMongoHealth =
    checkMongoHealth;

module.exports.getMongoMetrics =
    getMongoMetrics;
