/* =========================================================
   INCLURA APPLICATION CORE
   Express App Configuration Layer
   ========================================================= */

/* =========================================================
   ENVIRONMENT CONFIG
========================================================= */

require("dotenv").config();

/* =========================================================
   CORE IMPORTS
========================================================= */

const express = require("express");

const cors = require("cors");

const helmet = require("helmet");

const compression = require("compression");

const cookieParser = require("cookie-parser");

const morgan = require("morgan");

const rateLimit = require("express-rate-limit");

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
   EXPRESS APP INITIALIZATION
========================================================= */

const app = express();

/* =========================================================
   SECURITY CONFIGURATION
========================================================= */

app.use(helmet({

    crossOriginResourcePolicy: false

}));

app.use(cors({

    origin: process.env.CLIENT_URL || "*",

    credentials: true

}));

/* =========================================================
   PERFORMANCE OPTIMIZATION
========================================================= */

app.use(compression());

/* =========================================================
   REQUEST PARSING
========================================================= */

app.use(express.json({

    limit: "100mb"

}));

app.use(express.urlencoded({

    extended: true,

    limit: "100mb"

}));

app.use(cookieParser());

/* =========================================================
   REQUEST LOGGING
========================================================= */

app.use(morgan("dev"));

/* =========================================================
   RATE LIMITING
========================================================= */

const apiLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 1000,

    standardHeaders: true,

    legacyHeaders: false,

    message: {

        success: false,

        message:
            "Too many requests. Please try again later."

    }

});

app.use(apiLimiter);

/* =========================================================
   STATIC FILES
========================================================= */

app.use(

    "/uploads",

    express.static("uploads")

);

/* =========================================================
   ACCESSIBILITY SYSTEM
========================================================= */

app.use((req, res, next) => {

    res.setHeader(

        "X-Inclura-Accessibility",

        "enabled"

    );

    res.setHeader(

        "X-Inclura-Inclusive",

        "true"

    );

    next();

});

/* =========================================================
   API STATUS ROUTE
========================================================= */

app.get("/", (req, res) => {

    res.status(200).json({

        success: true,

        platform: "Inclura",

        message:
            "Inclura Backend API Running",

        version: "1.0.0",

        accessibility: true,

        realtime: true

    });

});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {

    res.status(200).json({

        success: true,

        server: "healthy",

        uptime: process.uptime(),

        timestamp: new Date()

    });

});

/* =========================================================
   API ROUTES
========================================================= */

/* =========================
   AUTH
========================= */

app.use(

    "/api/auth",

    authRoutes

);

/* =========================
   USERS
========================= */

app.use(

    "/api/users",

    authMiddleware,

    userRoutes

);

/* =========================
   POSTS
========================= */

app.use(

    "/api/posts",

    authMiddleware,

    postRoutes

);

/* =========================
   REELS
========================= */

app.use(

    "/api/reels",

    authMiddleware,

    reelRoutes

);

/* =========================
   LIVESTREAM
========================= */

app.use(

    "/api/livestream",

    authMiddleware,

    livestreamRoutes

);

/* =========================
   MARKETPLACE
========================= */

app.use(

    "/api/marketplace",

    authMiddleware,

    marketplaceRoutes

);

/* =========================
   WALLET
========================= */

app.use(

    "/api/wallet",

    authMiddleware,

    walletRoutes

);

/* =========================
   MENTORSHIP
========================= */

app.use(

    "/api/mentorship",

    authMiddleware,

    mentorshipRoutes

);

/* =========================
   EMERGENCY
========================= */

app.use(

    "/api/emergency",

    authMiddleware,

    emergencyRoutes

);

/* =========================
   CARE GIGS
========================= */

app.use(

    "/api/care-gigs",

    authMiddleware,

    careGigRoutes

);

/* =========================
   PAY & TOP-UP
========================= */

app.use(

    "/api/topup",

    authMiddleware,

    topupRoutes

);

/* =========================
   CROSS POST
========================= */

app.use(

    "/api/crosspost",

    authMiddleware,

    crossPostRoutes

);

/* =========================
   ANALYTICS
========================= */

app.use(

    "/api/analytics",

    authMiddleware,

    analyticsRoutes

);

/* =========================
   ADMIN
========================= */

app.use(

    "/api/admin",

    authMiddleware,

    adminRoutes

);

/* =========================
   NOTIFICATIONS
========================= */

app.use(

    "/api/notifications",

    authMiddleware,

    notificationRoutes

);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "API Route Not Found"

    });

});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(errorMiddleware);

/* =========================================================
   EXPORT APP
========================================================= */

module.exports = app;
