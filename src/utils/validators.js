const { z } = require("zod");

// Auth Validation Schemas
exports.registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Please provide a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["student", "instructor"]).optional(), // Defaults to student in Mongoose
  }),
});

exports.loginSchema = z.object({
  body: z.object({
    email: z.string().email("Please provide a valid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

// Course Validation Schemas
exports.createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(150),
    description: z.string().min(1, "Description is required").max(2000),
    category: z.enum([
      "web-development",
      "mobile-development",
      "data-science",
      "machine-learning",
      "devops",
      "design",
      "business",
      "other",
    ]),
  }),
});

// For update courses (all fields optional)
exports.updateCourseSchema = z.object({
  body: z.object({
    title: z.string().max(150).optional(),
    description: z.string().max(2000).optional(),
    category: z
      .enum([
        "web-development",
        "mobile-development",
        "data-science",
        "machine-learning",
        "devops",
        "design",
        "business",
        "other",
      ])
      .optional(),
  }),
});

exports.rateCourseSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5),
    review: z.string().max(500).optional().default(""),
  }),
  params: z.object({
    courseId: z.string().min(1, "Course ID is required"),
  }),
});

// Lesson Validation Schemas
exports.createLessonSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Lesson title is required").max(150),
    content: z.string().min(1, "Lesson content is required").max(5000),
    videoUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    order: z.number().min(1, "Order must be at least 1"),
  }),
  params: z.object({
    courseId: z.string().min(1, "Course ID is required"),
  }),
});

// Enrollment Validation Schemas
exports.enrollSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, "Course ID is required"),
  }),
});

exports.updateProgressSchema = z.object({
  body: z.object({
    lessonId: z.string().min(1, "Lesson ID is required"),
    completed: z.boolean(),
  }),
  params: z.object({
    enrollmentId: z.string().min(1, "Enrollment ID is required"),
  }),
});

// Comment Validation Schemas
exports.createCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, "Comment text is required").max(1000),
  }),
  params: z.object({
    lessonId: z.string().min(1, "Lesson ID is required"),
  }),
});
