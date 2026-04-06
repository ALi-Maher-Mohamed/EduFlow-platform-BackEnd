require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./src/middleware/errorHandler");

// ✅ 1. First, define connectDB
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

const app = express();

// Security Middleware
app.use(helmet());

const allowedOrigins = [
  "http://localhost:3000", // التطوير المحلي
  "http://localhost:5173", // Vite (لو بتستخدمه)
  "https://edu-flow1.netlify.app", // الـ frontend المستضاف
  "https://your-frontend-domain.vercel.app", // لو حطيت frontend على Vercel
];
// Enable CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin);
        callback(null, false); // أو callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true, // مهم للـ cookies والتوكن
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Route files
const auth = require("./src/routes/authRoutes");
const courses = require("./src/routes/courseRoutes");
const lessons = require("./src/routes/lessonRoutes");
const enrollments = require("./src/routes/enrollmentRoutes");
const comments = require("./src/routes/commentRoutes");

// test route
app.get("/", (req, res) => {
  res.send("EduFlow API is running!");
});

// Mount routers
app.use("/api/auth", auth);
app.use("/api/courses", courses);
app.use("/api/lessons", lessons);
app.use("/api/enrollments", enrollments);
app.use("/api/comments", comments);

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5500;

const server = app.listen(
  PORT,
  console.log(`Server is running on port ${PORT}`),
);

// Handle unhandled promise rejections Globally
process.on("unhandledRejection", (err, promise) => {
  console.log(`💥 Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
