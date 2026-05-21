/* =========================================================
   INCLURA POSTGRESQL CONNECTION
   Enterprise PostgreSQL Infrastructure
   ========================================================= */

const { Pool } = require("pg");

/* =========================================================
   POSTGRESQL CONNECTION POOL
========================================================= */

const pool = new Pool({

    user:
        process.env.POSTGRES_USER,

    host:
        process.env.POSTGRES_HOST,

    database:
        process.env.POSTGRES_DB,

    password:
        process.env.POSTGRES_PASSWORD,

    port:
        process.env.POSTGRES_PORT || 5432,

    /* =========================================
       CONNECTION POOL SETTINGS
    ========================================= */

    max: 30,

    min: 5,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 10000

});

/* =========================================================
   CONNECT TO POSTGRESQL
========================================================= */

const connectPostgreSQL = async () => {

    try {

        const client =
            await pool.connect();

        console.log(`
        ============================================
          POSTGRESQL CONNECTED SUCCESSFULLY
        ============================================

        Database:
        ${process.env.POSTGRES_DB}

        Host:
        ${process.env.POSTGRES_HOST}

        PostgreSQL Ready For:
        - Authentication
        - Wallets
        - Transactions
        - Marketplace Orders
        - Payments
        - Mentorship
        - Emergency Systems
        - Admin Systems

        ============================================
        `);

        client.release();

    } catch(error) {

        console.error(`
        ============================================
          POSTGRESQL CONNECTION FAILED
        ============================================

        ${error.message}

        ============================================
        `);

        process.exit(1);

    }

};

/* =========================================================
   DATABASE QUERY HELPER
========================================================= */

const query = async (

    text,
    params

) => {

    try {

        const result =
            await pool.query(text, params);

        return result;

    } catch(error) {

        console.error(
            "PostgreSQL Query Error:",
            error
        );

        throw error;

    }

};

/* =========================================================
   TRANSACTION HELPER
========================================================= */

const transaction = async (

    callback

) => {

    const client =
        await pool.connect();

    try {

        await client.query("BEGIN");

        const result =
            await callback(client);

        await client.query("COMMIT");

        return result;

    } catch(error) {

        await client.query("ROLLBACK");

        console.error(
            "Transaction Error:",
            error
        );

        throw error;

    } finally {

        client.release();

    }

};

/* =========================================================
   HEALTH CHECK
========================================================= */

const checkPostgresHealth = async () => {

    try {

        const result =
            await pool.query("SELECT NOW()");

        return {

            success: true,

            timestamp:
                result.rows[0].now

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
   DATABASE METRICS
========================================================= */

const getPostgresMetrics = () => {

    return {

        totalConnections:
            pool.totalCount,

        idleConnections:
            pool.idleCount,

        waitingConnections:
            pool.waitingCount

    };

};

/* =========================================================
   CONNECTION EVENTS
========================================================= */

pool.on(

    "connect",

    () => {

        console.log(
            "PostgreSQL client connected"
        );

    }

);

pool.on(

    "error",

    (error) => {

        console.error(
            "Unexpected PostgreSQL Error:",
            error
        );

    }

);

/* =========================================================
   PROCESS TERMINATION
========================================================= */

process.on(

    "SIGINT",

    async () => {

        await pool.end();

        console.log(
            "PostgreSQL pool closed"
        );

        process.exit(0);

    }

);

/* =========================================================
   EXPORTS
========================================================= */

module.exports =
    connectPostgreSQL;

module.exports.pool =
    pool;

module.exports.query =
    query;

module.exports.transaction =
    transaction;

module.exports.checkPostgresHealth =
    checkPostgresHealth;

module.exports.getPostgresMetrics =
    getPostgresMetrics;
