const asyncHandler = require("express-async-handler");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const paginateResults = require("../utils/pagination");
const ApiError = require("../utils/ApiError");

/**
 * @desc    Get logged in user's enrolled courses
 * @route   GET /api/enrollments/my
 * @access  Private (Student)
 */
exports.getMyEnrollments = asyncHandler(async (req, res, next) => {
  // Override query to only fetch the logged in user's enrollments
  req.query.student = req.user.id;

  const result = await paginateResults(
    Enrollment,
    req.query,
    [], // No text search on enrollment directly
    {
      path: "course",
      select:
        "title description thumbnail category averageRating totalEnrollments instructor",
    },
  );

  res.status(200).json(result);
});

/**
 * @desc    Enroll in a course
 * @route   POST /api/enrollments
 * @access  Private (Student)
 */
exports.enrollCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.body;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ApiError(`No course with id of ${courseId}`, 404));
  }

  // Generate initial progress array with all lessons set to incomplete
  const lessons = await Lesson.find({ course: courseId }).select("_id order");
  const initialProgress = lessons.map((lesson) => ({
    lesson: lesson._id,
    completed: false,
    completedAt: null,
  }));

  // Create enrollment
  try {
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      progress: initialProgress,
    });

    // Increment course totalEnrollments
    course.totalEnrollments += 1;
    await course.save();

    res.status(201).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError("You are already enrolled in this course", 400));
    }
    throw error;
  }
});

/**
 * @desc    Update progress for a specific lesson
 * @route   PATCH /api/enrollments/:enrollmentId/progress
 * @access  Private (Student)
 */
exports.updateProgress = asyncHandler(async (req, res, next) => {
  const { lessonId, completed } = req.body;
  const enrollmentId = req.params.enrollmentId;

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    student: req.user.id, // Verify ownership
  });

  if (!enrollment) {
    return next(new ApiError(`Enrollment not found or not authorized`, 404));
  }

  // Find the sub-document index in the progress array
  const lessonIndex = enrollment.progress.findIndex(
    (p) => p.lesson.toString() === lessonId,
  );

  // If lesson wasn't found in progress array (maybe a new lesson was added after enrollment)
  if (lessonIndex === -1) {
    enrollment.progress.push({
      lesson: lessonId,
      completed,
      completedAt: completed ? new Date() : null,
    });
  } else {
    // Update existing progress record
    enrollment.progress[lessonIndex].completed = completed;
    enrollment.progress[lessonIndex].completedAt = completed
      ? new Date()
      : null;
  }

  await enrollment.save();

  res.status(200).json({
    success: true,
    data: enrollment,
  });
});
