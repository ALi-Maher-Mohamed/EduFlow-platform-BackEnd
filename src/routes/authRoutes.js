const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  updateProfileImage,
  deleteProfileImage,
  updateProfile,
  deleteAccount,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const uploadProfile = require("../middleware/uploadProfile");

// Public routes
router.post("/register", uploadProfile.single("profileImage"), register);
router.post("/login", login);
router.post("/logout", logout);

// Private routes (require authentication)
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put(
  "/profile/image",
  protect,
  uploadProfile.single("profileImage"),
  updateProfileImage,
);
router.delete("/profile/image", protect, deleteProfileImage);
router.delete("/profile", protect, deleteAccount);

module.exports = router;
