/**
 * Extract validation errors from Zod error object
 */
const handleZodError = (err) => {
  const errors = err.issues
    ? err.issues.map((issue) => {
        return `${issue.path.join(".")} : ${issue.message}`;
      })
    : [err.message];

  const message = `Invalid input data: ${errors.join(", ")}`;

  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};
/**
 * Extract validation errors from Mongoose ValidationError
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return {
    message: "Invalid input data",
    errors: errors,
    statusCode: 400,
  };
};

/**
 * Handle MongoDB Duplicate Key Error
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg
    ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
    : "Duplicate field";
  return {
    message: `Duplicate field value: ${value}. Please use another value!`,
    statusCode: 400,
  };
};

/**
 * Handle MongoDB CastError (invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  return {
    message: `Invalid ${err.path}: ${err.value}.`,
    statusCode: 400,
  };
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let error = { ...err };
  error.message = err.message || "Internal Server Error";
  error.statusCode = err.statusCode || 500;

  // Log error for developers in dev mode
  if (process.env.NODE_ENV === "development") {
    console.error("ERROR 💥:", err);
  }

  // Handle Mongoose connection/timeout errors
  if (err.name === "MongooseServerSelectionError") {
    error.statusCode = 503;
    error.message = "Database connection service unavailable";
  }

  // Handle Mongoose bad ObjectId
  if (err.name === "CastError") {
    const castErr = handleCastErrorDB(err);
    error.message = castErr.message;
    error.statusCode = castErr.statusCode;
  }

  // Handle Mongoose duplicate key
  if (err.code === 11000) {
    const duplicateErr = handleDuplicateFieldsDB(err);
    error.message = duplicateErr.message;
    error.statusCode = duplicateErr.statusCode;
  }

  // Handle Mongoose validation error
  if (err.name === "ValidationError") {
    const validationErr = handleValidationErrorDB(err);
    error.message = validationErr.message;
    error.errors = validationErr.errors;
    error.statusCode = validationErr.statusCode;
  }

  // Handle Zod validation error
  if (err.name === "ZodError") {
    const zodErr = handleZodError(err);
    error.message = zodErr.message;
    error.errors = zodErr.errors;
    error.statusCode = zodErr.statusCode;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token. Please log in again.";
    error.statusCode = 401;
  }
  if (err.name === "TokenExpiredError") {
    error.message = "Your token has expired. Please log in again.";
    error.statusCode = 401;
  }

  // Handle Multer payload too large error
  if (err.code === "LIMIT_FILE_SIZE") {
    error.message = "File too large. Maximum size allowed is 5MB.";
    error.statusCode = 400;
  }

  // Send response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || undefined, // Include detailed errors if available
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
