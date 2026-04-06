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

  // Find user by email and select password
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ApiError("Invalid credentials", 401));
  }

  // ✅ Check if email is verified
  if (!user.isEmailVerified) {
    return next(
      new ApiError(
        "Please verify your email address before logging in. Check your inbox for verification link.",
        401,
      ),
    );
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
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

/**
 * @desc    Send email verification link
 * @route   POST /api/auth/send-verification-email
 * @access  Private
 */
exports.sendVerificationEmail = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // Check if already verified
  if (user.isEmailVerified) {
    return next(new ApiError("Email already verified", 400));
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Save token to user (expires in 24 hours)
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  // Create verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  // Email HTML
  const html = `
<div style="background: #f9fafb; padding: 2rem; border-radius: 12px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: #1a56db; padding: 2rem 2.5rem 1.75rem;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.25rem;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L4 7V13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13V7L12 3Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span style="color: white; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">EduFlow</span>
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 2rem 2.5rem 0;">
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 1.25rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">Email verification</p>
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 0.5rem; color: #111827; line-height: 1.3;">Almost there, <span style="color: #1a56db;">${user.name}</span> 👋</h1>
      <p style="color: #4b5563; font-size: 15px; margin: 0 0 1.75rem; line-height: 1.6;">Thanks for joining EduFlow! You're one step away from unlocking your learning journey. Confirm your email to get started.</p>
    </div>

    <!-- Verification Button -->
    <div style="padding: 0 2.5rem;">
      <div style="background: #f0f5ff; border-radius: 12px; border: 1px solid #c7d7ff; padding: 1.5rem; text-align: center;">
        <p style="font-size: 13px; color: #3b5bdb; margin: 0 0 1rem; font-weight: 500;">Tap the button below to verify your email</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #1a56db; color: white; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 500; letter-spacing: -0.2px;">Verify my email address</a>
        <p style="font-size: 12px; color: #6b7280; margin: 1rem 0 0;">Link expires in <strong>24 hours</strong></p>
      </div>
    </div>

    <!-- Manual Link -->
    <div style="padding: 1.5rem 2.5rem 0;">
      <p style="font-size: 13px; color: #4b5563; margin: 0 0 0.4rem;">Or copy this link manually:</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; opacity: 0.5;">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="font-family: monospace; font-size: 11px; color: #4b5563; word-break: break-all;">${verificationUrl}</span>
      </div>
    </div>

    <!-- Features -->
    <div style="padding: 1.5rem 2.5rem; display: flex; gap: 1.5rem;">
      <div style="flex: 1; display: flex; align-items: flex-start; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #eef2ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4361ee" stroke-width="2"/><path d="M12 8v4l2 2" stroke="#4361ee" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
        <div><p style="font-size: 12px; font-weight: 600; margin: 0 0 2px; color: #111827;">Expires in 24h</p><p style="font-size: 11px; color: #6b7280; margin: 0; line-height: 1.5;">Request a new link after it expires</p></div>
      </div>
      <div style="flex: 1; display: flex; align-items: flex-start; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#16a34a" stroke-width="2" stroke-linejoin="round"/></svg>
        </div>
        <div><p style="font-size: 12px; font-weight: 600; margin: 0 0 2px; color: #111827;">Secure link</p><p style="font-size: 11px; color: #6b7280; margin: 0; line-height: 1.5;">One-time use, safe & encrypted</p></div>
      </div>
    </div>

    <!-- Footer Note -->
    <div style="margin: 0 2.5rem; border-top: 1px solid #e5e7eb; padding: 1.25rem 0;">
      <p style="font-size: 12px; color: #6b7280; margin: 0; line-height: 1.6; text-align: center;">If you didn't create an EduFlow account, you can safely ignore this email. Nothing will change.</p>
    </div>

    <!-- Bottom Bar -->
    <div style="background: #f9fafb; padding: 1rem 2.5rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e5e7eb;">
      <span style="font-size: 11px; color: #6b7280;">© 2026 EduFlow, Inc.</span>
      <div style="display: flex; gap: 1rem;">
        <a href="${process.env.FRONTEND_URL}/privacy" style="font-size: 11px; color: #6b7280; text-decoration: none;">Privacy</a>
        <a href="${process.env.FRONTEND_URL}/unsubscribe" style="font-size: 11px; color: #6b7280; text-decoration: none;">Unsubscribe</a>
      </div>
    </div>

  </div>
</div>
`;

  await sendEmail({
    email: user.email,
    subject: "Verify Your Email Address - EduFlow",
    html,
  });

  res.status(200).json({
    success: true,
    message: "Verification email sent successfully",
  });
});

/**
 * @desc    Verify email with token
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Find user with valid token
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully! You can now login.",
  });
});

/**
 * @desc    Check if email is verified (for login)
 * @route   POST /api/auth/login (modified)
 * @access  Public
 */
// ⚠️ هذا تعديل على دالة login الموجودة - استبدلها بالكامل
// أو أضف هذا التحقق داخل دالة login الموجودة
