const mongoose = require("mongoose");

/**
 * Comment Model
 * Allows users to comment on individual lessons
 */
const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "Lesson is required"],
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying comments by lesson
commentSchema.index({ lesson: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
