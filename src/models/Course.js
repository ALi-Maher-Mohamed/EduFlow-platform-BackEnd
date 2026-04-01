const mongoose = require("mongoose");

/**
 * Course Model
 * Represents an online course created by an instructor
 * Includes embedded ratings array for student reviews
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    thumbnail: {
      type: String, // Cloudinary URL
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: {
        values: [
          "web-development",
          "mobile-development",
          "data-science",
          "machine-learning",
          "devops",
          "design",
          "business",
          "other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor is required"],
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: {
          type: String,
          maxlength: [500, "Review cannot exceed 500 characters"],
          default: "",
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalEnrollments: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: get lessons for this course
courseSchema.virtual("lessons", {
  ref: "Lesson",
  localField: "_id",
  foreignField: "course",
  justOne: false,
});

// Index for text search on title
courseSchema.index({ title: "text" });
courseSchema.index({ category: 1 });
courseSchema.index({ instructor: 1 });

/**
 * Recalculate the average rating from the ratings array
 */
courseSchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
  } else {
    const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
  }
};

module.exports = mongoose.model("Course", courseSchema);
