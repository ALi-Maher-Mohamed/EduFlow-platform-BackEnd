const ApiError = require("../utils/ApiError");

/**
 * Role authorization middleware
 * @param {...String} roles - Array of allowed roles (e.g., 'instructor', 'admin')
 * @returns {Function} Express middleware
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user object exists on request (set by protect middleware)
    if (!req.user) {
      return next(new ApiError("Not authorized, no user found", 401));
    }

    // Check if user's role is included in allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403,
        ),
      );
    }

    next();
  };
};
