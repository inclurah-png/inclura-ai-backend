/*
 * INCLURA ENTERPRISE SERVER
 * Existing API routes, database connections, Socket.IO,
 * security middleware, and creator-score integration.
 */

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

// Database connections
const connectMongoDB = require("./database/mongodb");
const connectPostgreSQL = require("./postgresql");
const connectRedis = require("./database/redis");

// Existing API routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const postRoutes = require("./routes/post.routes");
const reelRoutes = require("./routes/reel.routes");
const livestreamRoutes = require("./routes/livestream.routes");
const marketplaceRoutes = require("./routes/marketplace.routes");
const walletRoutes = require("./routes/wallet.routes");
const mentorshipRoutes = require("./routes/mentorship.routes");
const emergencyRoutes = require("./routes/emergency.routes");
const careGigRoutes = require("./routes/caregig.routes");
const topupRoutes = require("./routes/topup.routes");
const crossPostRoutes = require("./routes/crosspost.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const adminRoutes = require("./routes/admin.routes");
const notificationRoutes = require("./routes/notification.routes");

// Creator-score route
const creatorScoreRoutes = require("./creatorScore.routes");

// Existing root-level middleware files
const authMiddleware = require("./auth.middleware");
const errorMiddleware = require("./error.middleware");

// Express application
const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --------------------------------------------------
// SECURITY AND REQUEST MIDDLEWARE
// --------------------------------------------------

app.use(helmet());

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(compression());
app.use(cookieParser());

app.use(
  express.json({
    limit: "100mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb",
  })
);

app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests. Please try again later.",
});

app.use(limiter);

app.use("/uploads", express.static("uploads"));

app.use((req, res, next) => {
  res.setHeader("X-Inclura-Accessibility", "enabled");
  next();
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inclura Backend Running Successfully",
    version: "1.0.0",
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

// Authentication
app.use("/api/auth", authRoutes);

// Creator-score endpoint.
// Firebase ID-token verification is handled inside
// creatorScore.routes.js by firebaseAuth.middleware.js.
// Do not put the existing JWT authMiddleware in front
// of this route.
app.use("/api/creator-score", creatorScoreRoutes);

// Existing protected routes
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/posts", authMiddleware, postRoutes);
app.use("/api/reels", authMiddleware, reelRoutes);
app.use("/api/livestream", authMiddleware, livestreamRoutes);
app.use("/api/marketplace", authMiddleware, marketplaceRoutes);
app.use("/api/wallet", authMiddleware, walletRoutes);
app.use("/api/mentorship", authMiddleware, mentorshipRoutes);
app.use("/api/emergency", authMiddleware, emergencyRoutes);
app.use("/api/care-gigs", authMiddleware, careGigRoutes);
app.use("/api/topup", authMiddleware, topupRoutes);
app.use("/api/crosspost", authMiddleware, crossPostRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);

// --------------------------------------------------
// SOCKET.IO EVENTS
// --------------------------------------------------

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("send_message", (data) => {
    socket.broadcast.emit("receive_message", data);
  });

  socket.on("livestream_chat", (data) => {
    io.emit("livestream_chat", data);
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("send_notification", (data) => {
    socket.broadcast.emit("receive_notification", data);
  });

  socket.on("emergency_alert", (data) => {
    io.emit("emergency_alert", data);
  });

  socket.on("voice_navigation", (data) => {
    socket.emit("voice_navigation_response", {
      success: true,
      data,
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// --------------------------------------------------
// DATABASE INITIALIZATION
// --------------------------------------------------

const initializeDatabases = async () => {
  try {
    await connectMongoDB();
    await connectPostgreSQL();
    await connectRedis();

    console.log("All databases connected successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
};

// --------------------------------------------------
// ERROR HANDLING AND NOT FOUND
// Keep these after all API routes.
// --------------------------------------------------

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// --------------------------------------------------
// SERVER STARTUP
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initializeDatabases();

  server.listen(PORT, () => {
    console.log(`Inclura backend listening on port ${PORT}`);
  });
};

startServer();

// --------------------------------------------------
// PROCESS-LEVEL ERROR HANDLING
// --------------------------------------------------

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Exports
module.exports = {
  app,
  server,
  io,
};
