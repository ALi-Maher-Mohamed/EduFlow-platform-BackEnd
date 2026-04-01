const mongoose = require("mongoose");

/**
 * Lesson Model
 * Represents individual lessons within a course
 * Ordered by the 'order' field for sequential learning
 */
const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    content: {
      type: String,
      required: [true, "Lesson content is required"],
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      required: [true, "Lesson order is required"],
      min: [1, "Order must be at least 1"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient querying lessons by course in order
lessonSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);
