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
// src/controllers/enrollmentController.js

exports.updateProgress = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const { lessonId, completed } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res
        .status(404)
        .json({ success: false, message: "Enrollment not found" });
    }

    const progressIndex = enrollment.progress.findIndex(
      (p) => p.lesson.toString() === lessonId,
    );

    if (progressIndex > -1) {
      enrollment.progress[progressIndex].completed = completed;
      enrollment.progress[progressIndex].completedAt = completed
        ? Date.now()
        : null;
    } else {
      enrollment.progress.push({
        lesson: lessonId,
        completed: completed,
        completedAt: completed ? Date.now() : null,
      });
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};
