const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/**
 * Protect routes by verifying JWT token
 * Supports "Bearer token" in Authorization header or "token" in cookies
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 3. Make sure token exists
  if (!token) {
    return next(new ApiError("Not authorized to access this route", 401));
  }

  try {
    // 4. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Find user and attach to request
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError("User no longer exists", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError("Not authorized to access this route", 401));
  }
});
