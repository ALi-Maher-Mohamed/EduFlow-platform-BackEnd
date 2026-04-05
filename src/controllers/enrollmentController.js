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
  req.query.student = req.user.id;

  const result = await paginateResults(
    Enrollment,
    req.query,
    [],
    [
      {
        path: "course",
        select:
          "title description thumbnail category averageRating totalEnrollments instructor",
        populate: {
          path: "instructor",
          select: "name email",
        },
      },
      {
        path: "progress.lesson",
        select: "title order",
      },
    ],
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

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ApiError(`No course with id of ${courseId}`, 404));
  }

  const lessons = await Lesson.find({ course: courseId }).select("_id order");
  const initialProgress = lessons.map((lesson) => ({
    lesson: lesson._id,
    completed: false,
    completedAt: null,
  }));

  try {
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      progress: initialProgress,
    });

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
  const enrollmentId = req.params.id;

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    student: req.user.id,
  });

  if (!enrollment) {
    return next(new ApiError(`Enrollment not found or not authorized`, 404));
  }

  const lesson = await Lesson.findById(lessonId);
  if (!lesson || lesson.course.toString() !== enrollment.course.toString()) {
    return next(new ApiError(`Invalid lesson for this course`, 400));
  }

  const lessonIndex = enrollment.progress.findIndex(
    (p) => p.lesson.toString() === lessonId,
  );

  if (lessonIndex === -1) {
    enrollment.progress.push({
      lesson: lessonId,
      completed,
      completedAt: completed ? new Date() : null,
    });
  } else {
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
