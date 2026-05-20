/* =========================================================
   INCLURA REDIS CONNECTION
   Enterprise Redis Infrastructure
   ========================================================= */

const Redis = require("ioredis");

/* =========================================================
   REDIS CLIENT CONFIGURATION
========================================================= */

const redis = new Redis({

    host:
        process.env.REDIS_HOST || "127.0.0.1",

    port:
        process.env.REDIS_PORT || 6379,

    password:
        process.env.REDIS_PASSWORD || "",

    db:
        process.env.REDIS_DB || 0,

    retryStrategy(times) {

        const delay =
            Math.min(times * 100, 3000);

        return delay;

    },

    maxRetriesPerRequest: 5,

    enableReadyCheck: true,

    lazyConnect: false

});

/* =========================================================
   CONNECT REDIS
========================================================= */

const connectRedis = async () => {

    try {

        await redis.ping();

        console.log(`
        ============================================
              REDIS CONNECTED SUCCESSFULLY
        ============================================

        Host:
        ${process.env.REDIS_HOST || "127.0.0.1"}

        Port:
        ${process.env.REDIS_PORT || 6379}

        Redis Ready For:
        - Realtime Messaging
        - Livestream Viewer Counts
        - Notifications
        - Session Storage
        - API Caching
        - Trending Feeds
        - WebSocket Scaling
        - Rate Limiting

        ============================================
        `);

    } catch(error) {

        console.error(`
        ============================================
                REDIS CONNECTION FAILED
        ============================================

        ${error.message}

        ============================================
        `);

        process.exit(1);

    }

};

/* =========================================================
   REDIS EVENTS
========================================================= */

redis.on(

    "connect",

    () => {

        console.log(
            "Redis connection established"
        );

    }

);

redis.on(

    "ready",

    () => {

        console.log(
            "Redis server ready"
        );

    }

);

redis.on(

    "error",

    (error) => {

        console.error(
            "Redis Error:",
            error
        );

    }

);

redis.on(

    "close",

    () => {

        console.warn(
            "Redis connection closed"
        );

    }

);

redis.on(

    "reconnecting",

    () => {

        console.log(
            "Redis reconnecting..."
        );

    }

);

/* =========================================================
   CACHE HELPERS
========================================================= */

const setCache = async (

    key,
    value,
    expiration = 3600

) => {

    try {

        await redis.set(

            key,

            JSON.stringify(value),

            "EX",

            expiration

        );

    } catch(error) {

        console.error(
            "Redis Set Cache Error:",
            error
        );

    }

};

const getCache = async (key) => {

    try {

        const data =
            await redis.get(key);

        return data
            ? JSON.parse(data)
            : null;

    } catch(error) {

        console.error(
            "Redis Get Cache Error:",
            error
        );

        return null;

    }

};

const deleteCache = async (key) => {

    try {

        await redis.del(key);

    } catch(error) {

        console.error(
            "Redis Delete Cache Error:",
            error
        );

    }

};

/* =========================================================
   SESSION HELPERS
========================================================= */

const storeSession = async (

    sessionId,
    sessionData,
    expiration = 86400

) => {

    try {

        await redis.set(

            `session:${sessionId}`,

            JSON.stringify(sessionData),

            "EX",

            expiration

        );

    } catch(error) {

        console.error(
            "Session Store Error:",
            error
        );

    }

};

const getSession = async (

    sessionId

) => {

    try {

        const session =
            await redis.get(

                `session:${sessionId}`

            );

        return session
            ? JSON.parse(session)
            : null;

    } catch(error) {

        console.error(
            "Session Get Error:",
            error
        );

        return null;

    }

};

/* =========================================================
   REALTIME LIVESTREAM HELPERS
========================================================= */

const incrementViewerCount = async (

    livestreamId

) => {

    try {

        return await redis.incr(

            `livestream:${livestreamId}:viewers`

        );

    } catch(error) {

        console.error(
            "Viewer Increment Error:",
            error
        );

    }

};

const decrementViewerCount = async (

    livestreamId

) => {

    try {

        return await redis.decr(

            `livestream:${livestreamId}:viewers`

        );

    } catch(error) {

        console.error(
            "Viewer Decrement Error:",
            error
        );

    }

};

const getViewerCount = async (

    livestreamId

) => {

    try {

        return await redis.get(

            `livestream:${livestreamId}:viewers`

        );

    } catch(error) {

        console.error(
            "Viewer Count Error:",
            error
        );

        return 0;

    }

};

/* =========================================================
   TRENDING SYSTEM
========================================================= */

const updateTrendingScore = async (

    contentId,
    score

) => {

    try {

        await redis.zadd(

            "trending_content",

            score,

            contentId

        );

    } catch(error) {

        console.error(
            "Trending Update Error:",
            error
        );

    }

};

const getTrendingContent = async (

    limit = 20

) => {

    try {

        return await redis.zrevrange(

            "trending_content",

            0,

            limit - 1

        );

    } catch(error) {

        console.error(
            "Trending Fetch Error:",
            error
        );

        return [];

    }

};

/* =========================================================
   HEALTH CHECK
========================================================= */

const checkRedisHealth = async () => {

    try {

        const response =
            await redis.ping();

        return {

            success:
                response === "PONG"

        };

    } catch(error) {

        return {

            success: false,

            error:
                error.message

        };

    }

};

/* =========================================================
   METRICS
========================================================= */

const getRedisMetrics = async () => {

    try {

        const info =
            await redis.info();

        return info;

    } catch(error) {

        console.error(
            "Redis Metrics Error:",
            error
        );

        return null;

    }

};

/* =========================================================
   PROCESS TERMINATION
========================================================= */

process.on(

    "SIGINT",

    async () => {

        await redis.quit();

        console.log(
            "Redis connection closed"
        );

        process.exit(0);

    }

);

/* =========================================================
   EXPORTS
========================================================= */

module.exports =
    connectRedis;

module.exports.redis =
    redis;

module.exports.setCache =
    setCache;

module.exports.getCache =
    getCache;

module.exports.deleteCache =
    deleteCache;

module.exports.storeSession =
    storeSession;

module.exports.getSession =
    getSession;

module.exports.incrementViewerCount =
    incrementViewerCount;

module.exports.decrementViewerCount =
    decrementViewerCount;

module.exports.getViewerCount =
    getViewerCount;

module.exports.updateTrendingScore =
    updateTrendingScore;

module.exports.getTrendingContent =
    getTrendingContent;

module.exports.checkRedisHealth =
    checkRedisHealth;

module.exports.getRedisMetrics =
    getRedisMetrics;
