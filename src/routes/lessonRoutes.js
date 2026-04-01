const express = require("express");
const {
  getLessons,
  getLesson,
  createLesson,
} = require("../controllers/lessonController");

const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/roleCheck");
const validate = require("../middleware/validate");
const { createLessonSchema } = require("../utils/validators");

// Include other resource routers
const commentRouter = require("./commentRoutes");

// Nested route support (allows /api/courses/:courseId/lessons)
const router = express.Router({ mergeParams: true });

// Re-route into other resource routers
router.use("/:lessonId/comments", commentRouter);

router
  .route("/")
  .get(getLessons)
  .post(
    protect,
    authorize("instructor", "admin"),
    validate(createLessonSchema),
    createLesson,
  );

router.route("/:id").get(getLesson);

module.exports = router;
