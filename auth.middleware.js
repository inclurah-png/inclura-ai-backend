/* =========================================================
   INCLURA GLOBAL ERROR MIDDLEWARE
   Enterprise Error Handling Infrastructure
   ========================================================= */

/* =========================================================
   MAIN ERROR HANDLER
========================================================= */

const errorMiddleware = (

    error,
    req,
    res,
    next

) => {

    console.error(`
    ============================================
                INCLURA ERROR
    ============================================

    Message:
    ${error.message}

    Stack:
    ${error.stack}

    Route:
    ${req.originalUrl}

    Method:
    ${req.method}

    ============================================
    `);

    /* =========================================
       DEFAULT ERROR VALUES
    ========================================= */

    let statusCode =
        error.statusCode || 500;

    let message =
        error.message ||
        "Internal Server Error";

    let errors = [];

    /* =========================================
       MONGODB VALIDATION ERRORS
    ========================================= */

    if (error.name === "ValidationError") {

        statusCode = 400;

        message =
            "Validation Error";

        errors =
            Object.values(error.errors)
                .map(val => val.message);

    }

    /* =========================================
       MONGODB CAST ERRORS
    ========================================= */

    if (error.name === "CastError") {

        statusCode = 400;

        message =
            "Invalid Resource ID";

    }

    /* =========================================
       DUPLICATE KEY ERRORS
    ========================================= */

    if (error.code === 11000) {

        statusCode = 400;

        message =
            "Duplicate Field Value";

    }

    /* =========================================
       JWT ERRORS
    ========================================= */

    if (error.name === "JsonWebTokenError") {

        statusCode = 401;

        message =
            "Invalid Authentication Token";

    }

    /* =========================================
       JWT EXPIRED
    ========================================= */

    if (error.name === "TokenExpiredError") {

        statusCode = 401;

        message =
            "Session Expired. Please Login Again.";

    }

    /* =========================================
       POSTGRESQL ERRORS
    ========================================= */

    if (error.code === "23505") {

        status
