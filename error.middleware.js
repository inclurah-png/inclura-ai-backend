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
       MONGODB INVALID OBJECT ID
    ========================================= */

    if (error.name === "CastError") {

        statusCode = 400;

        message =
            "Invalid Resource ID";

    }

    /* =========================================
       DUPLICATE FIELD ERROR
    ========================================= */

    if (error.code === 11000) {

        statusCode = 400;

        message =
            "Duplicate Field Value Entered";

    }

    /* =========================================
       JWT INVALID TOKEN
    ========================================= */

    if (error.name === "JsonWebTokenError") {

        statusCode = 401;

        message =
            "Invalid Authentication Token";

    }

    /* =========================================
       JWT EXPIRED TOKEN
    ========================================= */

    if (error.name === "TokenExpiredError") {

        statusCode = 401;

        message =
            "Session Expired. Please Login Again.";

    }

    /* =========================================
       POSTGRESQL UNIQUE VIOLATION
    ========================================= */

    if (error.code === "23505") {

        statusCode = 400;

        message =
            "Duplicate Database Entry";

    }

    /* =========================================
       POSTGRESQL FOREIGN KEY ERROR
    ========================================= */

    if (error.code === "23503") {

        statusCode = 400;

        message =
            "Referenced Resource Does Not Exist";

    }

    /* =========================================
       FILE UPLOAD ERRORS
    ========================================= */

    if (error.code === "LIMIT_FILE_SIZE") {

        statusCode = 400;

        message =
            "Uploaded File Is Too Large";

    }

    /* =========================================
       RATE LIMIT ERRORS
    ========================================= */

    if (error.status === 429) {

        statusCode = 429;

        message =
            "Too Many Requests. Please Slow Down.";

    }

    /* =========================================
       ACCESSIBILITY FRIENDLY RESPONSE
    ========================================= */

    const response = {

        success: false,

        accessibilityFriendly: true,

        message,

        errors,

        timestamp:
            new Date().toISOString(),

        path:
            req.originalUrl

    };

    /* =========================================
       DEVELOPMENT ERROR DETAILS
    ========================================= */

    if (

        process.env.NODE_ENV === "development"

    ) {

        response.stack =
            error.stack;

    }

    /* =========================================
       SECURITY LOGGING
    ========================================= */

    if (statusCode >= 500) {

        console.error(`
        ============================================
                 SERVER ERROR DETECTED
        ============================================

        Time:
        ${new Date().toISOString()}

        IP:
        ${req.ip}

        User-Agent:
        ${req.headers["user-agent"]}

        ============================================
        `);

    }

    /* =========================================
       SEND RESPONSE
    ========================================= */

    res
        .status(statusCode)
        .json(response);

};

/* =========================================================
   CUSTOM ERROR CLASS
========================================================= */

class AppError extends Error {

    constructor(

        message,
        statusCode = 500

    ) {

        super(message);

        this.statusCode =
            statusCode;

        this.status =
            `${statusCode}`.startsWith("4")
                ? "fail"
                : "error";

        this.isOperational = true;

        Error.captureStackTrace(

            this,
            this.constructor

        );

    }

}

/* =========================================================
   ASYNC ERROR WRAPPER
========================================================= */

const asyncHandler = (

    fn

) => {

    return (

        req,
        res,
        next

    ) => {

        Promise.resolve(

            fn(req, res, next)

        ).catch(next);

    };

};

/* =========================================================
   NOT FOUND HANDLER
========================================================= */

const notFoundHandler = (

    req,
    res,
    next

) => {

    const error = new AppError(

        `Route Not Found: ${req.originalUrl}`,

        404

    );

    next(error);

};

/* =========================================================
   ACCESSIBILITY ERROR FORMATTER
========================================================= */

const accessibilityErrorFormatter = (

    message

) => {

    return {

        screenReaderText:
            message,

        voiceFriendly:
            true,

        readable:
            true

    };

};

/* =========================================================
   EXPORTS
========================================================= */

module.exports =
    errorMiddleware;

module.exports.AppError =
    AppError;

module.exports.asyncHandler =
    asyncHandler;

module.exports.notFoundHandler =
    notFoundHandler;

module.exports.accessibilityErrorFormatter =
    accessibilityErrorFormatter;
