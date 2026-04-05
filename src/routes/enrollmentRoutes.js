const express = require("express");
const {
  enrollCourse,
  getMyEnrollments,
  updateProgress,
} = require("../controllers/enrollmentController");

const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/roleCheck");
const validate = require("../middleware/validate");
const { enrollSchema, updateProgressSchema } = require("../utils/validators");

const router = express.Router();

router
  .route("/")
  .post(protect, authorize("student"), validate(enrollSchema), enrollCourse);

router.route("/my").get(protect, authorize("student"), getMyEnrollments);

router
  .route("/:id/progress")
  .patch(protect, authorize("student"), validate(updateProgressSchema), updateProgress);

module.exports = router;
