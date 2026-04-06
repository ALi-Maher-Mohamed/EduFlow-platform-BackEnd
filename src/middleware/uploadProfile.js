const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

/**
 * Configure Cloudinary storage for Profile Images
 */
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "eduflow/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto:good" },
    ],
  },
});

/**
 * File filter for images
 */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new ApiError("Not an image! Please upload only images.", 400), false);
  }
};

/**
 * Multer upload for profile images
 */
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = uploadProfile;
