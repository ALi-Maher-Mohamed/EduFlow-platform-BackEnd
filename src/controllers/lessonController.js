const asyncHandler = require("express-async-handler");
const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const ApiError = require("../utils/ApiError");

/**
 * @desc    Get lessons for a course
 * @route   GET /api/courses/:courseId/lessons
 * @access  Public
 */
exports.getLessons = asyncHandler(async (req, res, next) => {
  const query = Lesson.find({ course: req.params.courseId }).sort({ order: 1 });

  const lessons = await query;

  res.status(200).json({
    success: true,
    count: lessons.length,
    data: lessons,
  });
});

/**
 * @desc    Add a lesson to a course
 * @route   POST /api/courses/:courseId/lessons
 * @access  Private (Instructor only)
 */
exports.createLesson = asyncHandler(async (req, res, next) => {
  req.body.course = req.params.courseId;

  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return next(
      new ApiError(`No course with the id of ${req.params.courseId}`, 404),
    );
  }

  // Make sure user is course owner
  if (
    course.instructor.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ApiError(
        `User ${req.user.id} is not authorized to add a lesson to course ${course._id}`,
        403,
      ),
    );
  }

  const lesson = await Lesson.create(req.body);

  res.status(201).json({
    success: true,
    data: lesson,
  });
});

/**
 * @desc    Get single lesson
 * @route   GET /api/lessons/:id
 * @access  Public
 */
exports.getLesson = asyncHandler(async (req, res, next) => {
  const lesson = await Lesson.findById(req.params.id).populate({
    path: "course",
    select: "title description",
  });

  if (!lesson) {
    return next(new ApiError(`No lesson with the id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: lesson,
  });
});
