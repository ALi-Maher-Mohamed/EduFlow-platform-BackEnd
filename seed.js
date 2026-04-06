require("dotenv").config();
const mongoose = require("mongoose");
const Enrollment = require("./src/models/Enrollment");
const Course = require("./src/models/Course");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const clearEnrollments = async () => {
  try {
    console.log("🗑️ Clearing all enrollments...");

    // 1. Delete all enrollments
    const result = await Enrollment.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} enrollments`);

    // 2. Reset totalEnrollments in all courses to 0
    const courses = await Course.find({});
    for (const course of courses) {
      course.totalEnrollments = 0;
      await course.save();
    }
    console.log(`✅ Reset totalEnrollments for ${courses.length} courses`);

    console.log("\n🎉 All enrollments cleared successfully!");
    console.log("📚 Courses and lessons are still available.");
    console.log("👤 New users will start with empty dashboard.");

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

clearEnrollments();
