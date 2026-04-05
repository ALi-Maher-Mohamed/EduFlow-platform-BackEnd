const express = require("express");
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  rateCourse,
  getInstructorDashboard,
} = require("../controllers/courseController");

const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/roleCheck");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const {
  createCourseSchema,
  updateCourseSchema,
  rateCourseSchema,
} = require("../utils/validators");

// Include other resource routers
const lessonRouter = require("./lessonRoutes");
const router = express.Router();

// Re-route into other resource routers
router.use("/:courseId/lessons", lessonRouter);

router
  .route("/")
  .get(getCourses)
  .post(
    protect,
    authorize("instructor", "admin"),
    upload.single("thumbnail"),
    validate(createCourseSchema),
    createCourse,
  );

router
  .route("/instructor/dashboard")
  .get(protect, authorize("instructor"), getInstructorDashboard);

router
  .route("/:id")
  .get(getCourse)
  .put(
    protect,
    authorize("instructor", "admin"),
    upload.single("thumbnail"),
    validate(updateCourseSchema),
    updateCourse,
  )
  .delete(protect, authorize("instructor", "admin"), deleteCourse);

router
  .route("/:courseId/rate")
  .post(protect, authorize("student"), validate(rateCourseSchema), rateCourse);

module.exports = router;
