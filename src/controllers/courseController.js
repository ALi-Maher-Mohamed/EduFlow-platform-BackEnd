const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const ApiError = require("../utils/ApiError");
const paginateResults = require("../utils/pagination");

/**
 * @desc    Get all courses with pagination, search, filtering, sorting
 * @route   GET /api/courses
 * @access  Public
 */
exports.getCourses = asyncHandler(async (req, res, next) => {
  const result = await paginateResults(
    Course,
    req.query,
    ["title", "description", "category"],
    { path: "instructor", select: "name email" },
  );

  res.status(200).json(result);
});

/**
 * @desc    Get instructor dashboard data (their courses with stats)
 * @route   GET /api/courses/instructor/dashboard
 * @access  Private (Instructor)
 */
exports.getInstructorDashboard = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({ instructor: req.user.id }).populate({
    path: "lessons",
    select: "title order",
    options: { sort: { order: 1 } },
  });

  const totalStudents = courses.reduce(
    (acc, course) => acc + (course.totalEnrollments || 0),
    0,
  );
  const avgRatingOverall =
    courses.length > 0
      ? courses.reduce((acc, course) => acc + (course.averageRating || 0), 0) /
        courses.length
      : 0;

  res.status(200).json({
    success: true,
    count: courses.length,
    analytics: {
      totalStudents,
      overallRating: Math.round(avgRatingOverall * 10) / 10,
    },
    data: courses,
  });
});

/**
 * @desc    Get single course details for instructor (including enrolled students)
 * @route   GET /api/courses/instructor/courses/:id
 * @access  Private (Instructor)
 */
exports.getInstructorCourseDetails = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate({
    path: "lessons",
    select: "title order",
    options: { sort: { order: 1 } },
  });

  if (!course) {
    return next(
      new ApiError(`Course not found with id of ${req.params.id}`, 404),
    );
  }

  // Ensure current user is the instructor of the course
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ApiError(
        `User ${req.user.id} is not authorized to view this course's details`,
        403,
      ),
    );
  }

  // Get enrolled users with their progress
  const enrollments = await Enrollment.find({ course: course._id })
    .populate({
      path: "student",
      select: "name email avatar",
    })
    .select("-course");

  res.status(200).json({
    success: true,
    data: {
      course,
      enrollments,
    },
  });
});

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public
 */
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate({
      path: "instructor",
      select: "name email",
    })
    .populate({
      path: "lessons",
      select: "title order",
      options: { sort: { order: 1 } },
    });

  if (!course) {
    return next(
      new ApiError(`Course not found with id of ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Instructor only)
 */
exports.createCourse = asyncHandler(async (req, res, next) => {
  req.body.instructor = req.user.id;

  if (req.file) {
    req.body.thumbnail = req.file.path;
  }

  const course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course,
  });
});

/**
 * @desc    Update a course
 * @route   PUT /api/courses/:id
 * @access  Private (Instructor only)
 */
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ApiError(`Course not found with id of ${req.params.id}`, 404),
    );
  }

  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ApiError(
        `User ${req.user.id} is not authorized to update this course`,
        403,
      ),
    );
  }

  if (req.file) {
    req.body.thumbnail = req.file.path;
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: course,
  });
});

/**
 * @desc    Delete a course
 * @route   DELETE /api/courses/:id
 * @access  Private (Private Instructor only)
 */
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ApiError(`Course not found with id of ${req.params.id}`, 404),
    );
  }

  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ApiError(
        `User ${req.user.id} is not authorized to delete this course`,
        403,
      ),
    );
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Rate a course
 * @route   POST /api/courses/:courseId/rate
 * @access  Private (Enrolled Students only)
 */
exports.rateCourse = asyncHandler(async (req, res, next) => {
  const { rating, review } = req.body;
  const courseId = req.params.courseId;

  // 1. Verify user is enrolled in the course
  const enrollment = await Enrollment.findOne({
    student: req.user.id,
    course: courseId,
  });

  if (!enrollment) {
    return next(new ApiError("You must be enrolled to rate this course", 403));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ApiError("Course not found", 404));
  }

  // 2. Check if user already rated
  const existingRatingIndex = course.ratings.findIndex(
    (r) => r.user.toString() === req.user.id.toString(),
  );

  if (existingRatingIndex !== -1) {
    // Update existing rating
    course.ratings[existingRatingIndex].rating = rating;
    course.ratings[existingRatingIndex].review = review;
  } else {
    // Add new rating
    course.ratings.push({
      user: req.user.id,
      rating,
      review,
    });
  }

  // 3. Recalculate average rating
  course.calculateAverageRating();
  await course.save();

  res.status(200).json({
    success: true,
    data: course,
  });
});
