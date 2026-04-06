require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Comment = require("../models/Comment");

// ✅ تأكد من الـ URI
console.log("🔗 Connecting to:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// ✅ Listeners
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB Connected");
});
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB Error:", err.message);
  process.exit(1);
});

const seedData = async () => {
  try {
    if (process.argv[2] === "-i" || process.argv[2] === "--import") {
      // Clear all existing data
      console.log("🗑️ Destroying existing data...");
      await User.deleteMany();
      await Course.deleteMany();
      await Lesson.deleteMany();
      await Enrollment.deleteMany();
      await Comment.deleteMany();

      console.log("📦 Generating fresh data...");

      // ✅ توحيد الباسوردات
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);

      // 1. Create Users (2 Instructors + 5 Students)
      const users = await User.create([
        {
          name: "John Instructor",
          email: "john@eduflow.com",
          password: hashedPassword,
          role: "instructor",
        },
        {
          name: "Jane Teacher",
          email: "jane@eduflow.com",
          password: hashedPassword,
          role: "instructor",
        },
        {
          name: "Alice Student",
          email: "alice@eduflow.com",
          password: hashedPassword,
          role: "student",
        },
        {
          name: "Bob Student",
          email: "bob@eduflow.com",
          password: hashedPassword,
          role: "student",
        },
        {
          name: "Charlie Student",
          email: "charlie@eduflow.com",
          password: hashedPassword,
          role: "student",
        },
        {
          name: "Diana Student",
          email: "diana@eduflow.com",
          password: hashedPassword,
          role: "student",
        },
        {
          name: "Evan Student",
          email: "evan@eduflow.com",
          password: hashedPassword,
          role: "student",
        },
      ]);

      const instructors = [users[0], users[1]];
      const students = users.slice(2);
      console.log("✅ Users created");

      // 2. Create 6 Courses
      const coursesData = [
        {
          title: "MERN Stack Masterclass",
          description: "Learn MongoDB, Express, React, Node",
          category: "web-development",
        },
        {
          title: "Flutter for Beginners",
          description: "Build cross platform apps",
          category: "mobile-development",
        },
        {
          title: "Python Data Science",
          description: "Pandas, NumPy, and Scikit-Learn",
          category: "data-science",
        },
        {
          title: "UI/UX Foundations",
          description: "Figma and design principles",
          category: "design",
        },
        {
          title: "Docker & Kubernetes",
          description: "Containerization and orchestration",
          category: "devops",
        },
        {
          title: "Digital Marketing Strategy",
          description: "SEO, SEM, and Social Media",
          category: "business",
        },
      ];

      const courses = [];
      for (let i = 0; i < coursesData.length; i++) {
        const course = await Course.create({
          ...coursesData[i],
          instructor: instructors[i % 2]._id,
        });
        courses.push(course);
      }
      console.log("✅ Courses created");

      // 3. Create Lessons (3 per course)
      const lessons = [];
      for (const course of courses) {
        for (let j = 1; j <= 3; j++) {
          const lesson = await Lesson.create({
            title: `Lesson ${j}: ${course.title.split(" ")[0]} Fundamentals`,
            content: `This is the comprehensive content for lesson ${j}. It covers all the fundamentals of ${course.title}.`,
            videoUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
            order: j,
            course: course._id,
          });
          lessons.push(lesson);
        }
      }
      console.log("✅ Lessons created");

      // 4. Create Enrollments and Progress
      for (const student of students) {
        const shuffledCourses = [...courses].sort(() => 0.5 - Math.random());
        const enrolledCourses = shuffledCourses.slice(0, 2);

        for (const course of enrolledCourses) {
          const courseLessons = lessons.filter(
            (l) => l.course.toString() === course._id.toString(),
          );
          const progress = courseLessons.map((l, index) => ({
            lesson: l._id,
            completed: index === 0,
            completedAt: index === 0 ? new Date() : null,
          }));

          await Enrollment.create({
            student: student._id,
            course: course._id,
            progress,
          });

          course.totalEnrollments += 1;
          await course.save();
        }
      }
      console.log("✅ Enrollments created");

      // 5. Create Comments and Ratings
      for (const course of courses) {
        const enrollments = await Enrollment.find({ course: course._id });
        const enrolledStudents = enrollments.map((e) => e.student);

        if (enrolledStudents.length > 0) {
          course.ratings.push({
            user: enrolledStudents[0],
            rating: 4 + Math.floor(Math.random() * 2),
            review: "Great course, highly recommended!",
          });
          course.calculateAverageRating();
          await course.save();

          const firstLesson = lessons.find(
            (l) =>
              l.course.toString() === course._id.toString() && l.order === 1,
          );
          if (firstLesson) {
            await Comment.create({
              user: enrolledStudents[0],
              lesson: firstLesson._id,
              text: "Thanks for this amazing introduction!",
            });
          }
        }
      }
      console.log("✅ Comments and Ratings created");

      console.log("\n🎉 Data Imported Successfully!");
      console.log("\n📋 Login Credentials (All users):");
      console.log(
        "Email: any of john@eduflow.com, jane@eduflow.com, alice@eduflow.com, etc.",
      );
      console.log("Password: password123");

      process.exit(0);
    } else if (process.argv[2] === "-d" || process.argv[2] === "--destroy") {
      console.log("🗑️ Destroying existing data...");
      await User.deleteMany();
      await Course.deleteMany();
      await Lesson.deleteMany();
      await Enrollment.deleteMany();
      await Comment.deleteMany();
      console.log("✅ Data Destroyed!");
      process.exit(0);
    } else {
      console.log("Please provide a flag:");
      console.log("  -i or --import  : Import seed data");
      console.log("  -d or --destroy : Destroy all data");
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
