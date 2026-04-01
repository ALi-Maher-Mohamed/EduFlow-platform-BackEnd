const express = require("express");
const {
  getComments,
  createComment,
} = require("../controllers/commentController");

const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createCommentSchema } = require("../utils/validators");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(getComments)
  .post(protect, validate(createCommentSchema), createComment);

module.exports = router;
