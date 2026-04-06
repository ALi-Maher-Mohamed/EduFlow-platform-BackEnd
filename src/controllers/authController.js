const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");

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
        profileImage: user.profileImage || null,
      },
    });
};

/**
 * @desc    Register a user (with optional profile image)
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

  // Prepare user data
  const userData = {
    name,
    email,
    password,
    role: role || "student",
  };

  // If profile image was uploaded, add it to userData
  if (req.file) {
    userData.profileImage = req.file.path; // Cloudinary URL
    userData.profileImagePublicId = req.file.filename; // Cloudinary public_id
  }

  // Create user
  const user = await User.create(userData);

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
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: "User successfully logged out",
  });
});

/**
 * @desc    Update user profile image
 * @route   PUT /api/auth/profile/image
 * @access  Private
 */
exports.updateProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError("Please upload an image file", 400));
  }

  const user = req.user;

  // If user already has a profile image, delete the old one from Cloudinary
  if (user.profileImagePublicId) {
    try {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    } catch (error) {
      console.error("Error deleting old image from Cloudinary:", error);
      // Continue anyway - don't block the update if deletion fails
    }
  }

  // Update user with new image
  user.profileImage = req.file.path;
  user.profileImagePublicId = req.file.filename;
  await user.save();

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
});

/**
 * @desc    Delete user profile image (set to null)
 * @route   DELETE /api/auth/profile/image
 * @access  Private
 */
exports.deleteProfileImage = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // If user has a profile image, delete it from Cloudinary
  if (user.profileImagePublicId) {
    try {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
      // Continue anyway
    }
  }

  // Set profile image fields to null
  user.profileImage = null;
  user.profileImagePublicId = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile image removed successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: null,
    },
  });
});

/**
 * @desc    Update user profile (name, email)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;
  const user = req.user;

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new ApiError("Email already in use", 400));
    }
    user.email = email;
  }

  if (name) {
    user.name = name;
  }

  await user.save();

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
});
/**
 * @desc    Delete user account and all associated data
 * @route   DELETE /api/auth/profile
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const userId = user._id;

  console.log(`Starting account deletion for user: ${userId} (${user.email})`);

  // 1. Delete profile image from Cloudinary if exists
  if (user.profileImagePublicId) {
    try {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
      console.log(`✅ Deleted profile image: ${user.profileImagePublicId}`);
    } catch (error) {
      console.error(`❌ Error deleting profile image: ${error.message}`);
    }
  }

  // 2. If user is an instructor, delete all their courses and course thumbnails
  if (user.role === "instructor") {
    try {
      const Course = require("../models/Course");
      const courses = await Course.find({ instructor: userId });

      console.log(`Found ${courses.length} courses to delete for instructor`);

      // Delete each course's thumbnail from Cloudinary
      for (const course of courses) {
        if (course.thumbnail) {
          // Extract public_id from Cloudinary URL if thumbnailPublicId doesn't exist
          let publicId = course.thumbnailPublicId;

          if (!publicId && course.thumbnail) {
            // Extract public_id from URL (e.g., eduflow/courses/xxx.jpg)
            const urlParts = course.thumbnail.split("/");
            const filename = urlParts[urlParts.length - 1];
            const folder = urlParts[urlParts.length - 2];
            publicId = `${folder}/${filename.split(".")[0]}`;
          }

          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
              console.log(`✅ Deleted course thumbnail: ${publicId}`);
            } catch (err) {
              console.error(`❌ Failed to delete thumbnail: ${err.message}`);
            }
          }
        }
      }

      // Delete all courses
      await Course.deleteMany({ instructor: userId });
      console.log(`✅ Deleted ${courses.length} courses for instructor`);
    } catch (error) {
      console.error(`❌ Error deleting instructor courses: ${error.message}`);
    }
  }

  // 3. If user is a student, delete all enrollments
  if (user.role === "student") {
    try {
      const Enrollment = require("../models/Enrollment");
      const result = await Enrollment.deleteMany({ student: userId });
      console.log(`✅ Deleted ${result.deletedCount} enrollments for student`);
    } catch (error) {
      console.error(`❌ Error deleting student enrollments: ${error.message}`);
    }
  }

  // 4. Delete the user account
  await User.findByIdAndDelete(userId);
  console.log(`✅ Deleted user account: ${userId}`);

  // 5. Clear the cookie
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});
