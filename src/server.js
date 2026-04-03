require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Connect to Database
connectDB();

const app = express();

// Security Middleware
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : "*",
    credentials: true,
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
const auth = require("./routes/authRoutes");
const courses = require("./routes/courseRoutes");
const lessons = require("./routes/lessonRoutes");
const enrollments = require("./routes/enrollmentRoutes");
const comments = require("./routes/commentRoutes");

// Mount routers
app.use("/api/auth", auth);
app.use("/api/courses", courses);
app.use("/api/lessons", lessons);
app.use("/api/enrollments", enrollments);
app.use("/api/comments", comments);

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5500;

const server = app.listen(PORT, console.log(`http://localhost:${PORT}`));

// Handle unhandled promise rejections Globally
process.on("unhandledRejection", (err, promise) => {
  console.log(`💥 Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
