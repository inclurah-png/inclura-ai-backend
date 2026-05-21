/* =========================================================
   INCLURA ENTERPRISE SERVER
   Main Backend Server Infrastructure
   ========================================================= */

/* =========================================================
   CORE IMPORTS
========================================================= */

require("dotenv").config();

const express = require("express");

const http = require("http");

const cors = require("cors");

const helmet = require("helmet");

const compression = require("compression");

const morgan = require("morgan");

const cookieParser = require("cookie-parser");

const rateLimit = require("express-rate-limit");

const { Server } = require("socket.io");

/* =========================================================
   DATABASE CONNECTIONS
========================================================= */

const connectMongoDB =
    require("./database/mongodb");

const connectPostgreSQL =
    require("./postgresql");

const connectRedis =
    require("./database/redis");

/* =========================================================
   ROUTES
========================================================= */

const authRoutes =
    require("./routes/auth.routes");

const userRoutes =
    require("./routes/user.routes");

const postRoutes =
    require("./routes/post.routes");

const reelRoutes =
    require("./routes/reel.routes");

const livestreamRoutes =
    require("./routes/livestream.routes");

const marketplaceRoutes =
    require("./routes/marketplace.routes");

const walletRoutes =
    require("./routes/wallet.routes");

const mentorshipRoutes =
    require("./routes/mentorship.routes");

const emergencyRoutes =
    require("./routes/emergency.routes");

const careGigRoutes =
    require("./routes/caregig.routes");

const topupRoutes =
    require("./routes/topup.routes");

const crossPostRoutes =
    require("./routes/crosspost.routes");

const analyticsRoutes =
    require("./routes/analytics.routes");

const adminRoutes =
    require("./routes/admin.routes");

const notificationRoutes =
    require("./routes/notification.routes");

/* =========================================================
   MIDDLEWARE
========================================================= */

const authMiddleware =
    require("./middleware/auth.middleware");

const errorMiddleware =
    require("./middleware/error.middleware");

/* =========================================================
   EXPRESS APP
========================================================= */

const app = express();

const server = http.createServer(app);

/* =========================================================
   SOCKET.IO
========================================================= */

const io = new Server(server, {

    cors: {

        origin: "*",

        methods: ["GET", "POST"]

    }

});

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(cors({

    origin: "*",

    credentials: true

}));

app.use(compression());

app.use(cookieParser());

/* =========================================================
   BODY PARSER
========================================================= */

app.use(express.json({

    limit: "100mb"

}));

app.use(express.urlencoded({

    extended: true,

    limit: "100mb"

}));

/* =========================================================
   LOGGER
========================================================= */

app.use(morgan("dev"));

/* =========================================================
   RATE LIMITER
========================================================= */

const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 1000,

    message:
        "Too many requests. Please try again later."

});

app.use(limiter);

/* =========================================================
   STATIC FILES
========================================================= */

app.use(

    "/uploads",

    express.static("uploads")

);

/* =========================================================
   ACCESSIBILITY HEADERS
========================================================= */

app.use((req, res, next) => {

    res.setHeader(

        "X-Inclura-Accessibility",

        "enabled"

    );

    next();

});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {

    res.status(200).json({

        success: true,

        message:
            "Inclura Backend Running Successfully",

        version: "1.0.0"

    });

});

/* =========================================================
   API ROUTES
========================================================= */

app.use(

    "/api/auth",

    authRoutes

);

app.use(

    "/api/users",

    authMiddleware,

    userRoutes

);

app.use(

    "/api/posts",

    authMiddleware,

    postRoutes

);

app.use(

    "/api/reels",

    authMiddleware,

    reelRoutes

);

app.use(

    "/api/livestream",

    authMiddleware,

    livestreamRoutes

);

app.use(

    "/api/marketplace",

    authMiddleware,

    marketplaceRoutes

);

app.use(

    "/api/wallet",

    authMiddleware,

    walletRoutes

);

app.use(

    "/api/mentorship",

    authMiddleware,

    mentorshipRoutes

);

app.use(

    "/api/emergency",

    authMiddleware,

    emergencyRoutes

);

app.use(

    "/api/care-gigs",

    authMiddleware,

    careGigRoutes

);

app.use(

    "/api/topup",

    authMiddleware,

    topupRoutes

);

app.use(

    "/api/crosspost",

    authMiddleware,

    crossPostRoutes

);

app.use(

    "/api/analytics",

    authMiddleware,

    analyticsRoutes

);

app.use(

    "/api/admin",

    authMiddleware,

    adminRoutes

);

app.use(

    "/api/notifications",

    authMiddleware,

    notificationRoutes

);

/* =========================================================
   SOCKET EVENTS
========================================================= */

io.on("connection", (socket) => {

    console.log(

        `User Connected: ${socket.id}`

    );

    /* =========================================
       REALTIME MESSAGING
    ========================================= */

    socket.on("send_message", (data) => {

        io.emit("receive_message", data);

    });

    /* =========================================
       LIVESTREAM CHAT
    ========================================= */

    socket.on("livestream_chat", (data) => {

        io.emit("livestream_chat_update", data);

    });

    /* =========================================
       TYPING INDICATOR
    ========================================= */

    socket.on("typing", (data) => {

        socket.broadcast.emit(

            "user_typing",

            data

        );

    });

    /* =========================================
       NOTIFICATIONS
    ========================================= */

    socket.on("send_notification", (data) => {

        io.emit("receive_notification", data);

    });

    /* =========================================
       EMERGENCY ALERTS
    ========================================= */

    socket.on("emergency_alert", (data) => {

        io.emit("emergency_broadcast", data);

    });

    /* =========================================
       ACCESSIBILITY EVENTS
    ========================================= */

    socket.on("voice_navigation", (data) => {

        io.emit(

            "voice_navigation_update",

            data

        );

    });

    /* =========================================
       DISCONNECT
    ========================================= */

    socket.on("disconnect", () => {

        console.log(

            `User Disconnected: ${socket.id}`

        );

    });

});

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

const initializeDatabases = async () => {

    try {

        await connectMongoDB();

        await connectPostgreSQL();

        await connectRedis();

        console.log(
            "All databases connected successfully"
        );

    } catch(error) {

        console.error(

            "Database initialization failed",

            error

        );

        process.exit(1);

    }

};

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(errorMiddleware);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Route not found"

    });

});

/* =========================================================
   SERVER START
========================================================= */

const PORT =
    process.env.PORT || 5000;

const startServer = async () => {

    await initializeDatabases();

    server.listen(PORT, () => {

        console.log(`
        ============================================
                 INCLURA SERVER STARTED
        ============================================

        Environment: ${process.env.NODE_ENV}

        Port: ${PORT}

        API URL:
        http://localhost:${PORT}

        Socket.IO Enabled

        Accessibility Engine Active

        Livestream Engine Ready

        ============================================
        `);

    });

};

startServer();

/* =========================================================
   GLOBAL ERROR CATCHERS
========================================================= */

process.on(

    "uncaughtException",

    (error) => {

        console.error(

            "Uncaught Exception",

            error

        );

    }

);

process.on(

    "unhandledRejection",

    (error) => {

        console.error(

            "Unhandled Rejection",

            error

        );

    }

);

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    app,

    server,

    io

};
