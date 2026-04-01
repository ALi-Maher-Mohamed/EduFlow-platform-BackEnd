const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/**
 * Configure cookie options
 */
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  ),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Helper to generate token and send response
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    },
  );

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
};

/**
 * @desc    Register a user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ApiError("Email already in use", 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || "student",
  });

  sendTokenResponse(user, 201, res);
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email and select password since it has select: false by default
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ApiError("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ApiError("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  // req.user is set by auth middleware
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

/**
 * @desc    Log user out / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000), // Expire cookie 10s from now
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: "User successfully logged out",
  });
});
