const asyncHandler = require("express-async-handler");
const Comment = require("../models/Comment");
const Lesson = require("../models/Lesson");
const ApiError = require("../utils/ApiError");

/**
 * @desc    Get comments for a lesson
 * @route   GET /api/lessons/:lessonId/comments
 * @access  Public
 */
exports.getComments = asyncHandler(async (req, res, next) => {
  const comments = await Comment.find({ lesson: req.params.lessonId })
    .populate({
      path: "user",
      select: "name",
    })
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

/**
 * @desc    Add a comment to a lesson
 * @route   POST /api/lessons/:lessonId/comments
 * @access  Private
 */
exports.createComment = asyncHandler(async (req, res, next) => {
  req.body.lesson = req.params.lessonId;
  req.body.user = req.user.id; // From auth protect middleware

  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    return next(
      new ApiError(`No lesson with the id of ${req.params.lessonId}`, 404),
    );
  }

  const comment = await Comment.create(req.body);

  res.status(201).json({
    success: true,
    data: comment,
  });
});
