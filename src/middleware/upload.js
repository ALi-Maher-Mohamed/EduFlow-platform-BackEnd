const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

/**
 * Configure Cloudinary storage for Multer
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "eduflow/courses",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 450, crop: "limit" }], // 16:9 aspect ratio standard for course thumbnails
  },
});

/**
 * File filter to strictly accept only images
 */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new ApiError("Not an image! Please upload only images.", 400), false);
  }
};

/**
 * Multer upload middleware configured for course thumbnails
 * - Uses Cloudinary storage
 * - Limits file size to 5MB
 * - Only accepts images
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
