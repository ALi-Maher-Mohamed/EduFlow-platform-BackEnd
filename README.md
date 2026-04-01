# EduFlow - Online Learning Platform API

A robust, production-ready RESTful API for an Online Learning Platform built with Node.js, Express, MongoDB, and Mongoose.

## 🚀 Features

### Core Requirements

- **RESTful API** built with Express.js
- **MongoDB** integration using Mongoose (5 distinct models)
- **JWT Authentication** (httpOnly cookies & Bearer token support)
- **Input Validation** using Zod middleware
- **Advanced Pagination + Filtering + Sorting** on fetching endpoints
- **File Uploads** for course thumbnails using Multer & Cloudinary (Max 5MB)
- **Centralized Error Handling** for Mongoose, Zod, JWT, and Multer errors
- **Clean Folder Structure** following MVC patterns

### Application Features

- **Role-Based Access Control** (Students & Instructors)
- **Course Management** (CRUD operations, thumbnail images, category filtering)
- **Lesson Management** (Ordered modules within courses)
- **Enrollment System** (Students can enroll, track progress per lesson)
- **Comments & Ratings** (Students can rate courses, comment on lessons)

## 🛠️ Tech Stack

- **Node.js** & **Express** - Backend Framework
- **MongoDB** & **Mongoose** - Database & ODM
- **JSON Web Token (JWT)** & **Bcrypt.js** - Authentication & Security
- **Zod** - Schema Validation
- **Multer** & **Cloudinary** - Image Upload & Cloud Storage
- **Helmet** & **CORS** - Security Headers and Cross-Origin Resource Sharing

## 📁 Project Structure

```text
EduFlow/
├── src/
│   ├── config/          # DB & Cloudinary configs
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Auth, Upload, Error Validation middlewares
│   ├── models/           # Mongoose Data Models
│   ├── routes/           # Express Routers
│   ├── scripts/          # Seeding script
│   ├── utils/            # Error classes, Pagination helpers
│   └── server.js         # Entry Point
├── postman/              # Postman collection
├── .env.example          # Environment variables template
├── README.md             # Project Documentation
└── package.json
```

## 📦 Models Explanation

1. **User**: Stores users with `student` and `instructor` roles. Uses bcrypt to hash passwords automatically.
2. **Course**: Created by an instructor. Contains a Cloudinary thumbnail, a category, and an embedded `ratings` array to track student reviews. Recalculates average rating dynamically.
3. **Lesson**: Associated with a specific course. Contains content, an optional video URL, and is strictly ordered.
4. **Enrollment**: Links a student to a course. Tracks granular progress via an embedded `progress` array indicating completed lessons and completion timestamps.
5. **Comment**: Allows any authenticated user to leave a comment on a specific lesson.

## 🔑 Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

| Variable                | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `PORT`                  | Local server port (default: 5000)                |
| `NODE_ENV`              | Environment mode (`development` or `production`) |
| `MONGO_URI`             | MongoDB connection string                        |
| `JWT_SECRET`            | Secret key for JWT signing                       |
| `JWT_EXPIRE`            | JWT expiration time (e.g., `7d`)                 |
| `JWT_COOKIE_EXPIRE`     | Cookie expiration in days (e.g., `7`)            |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Name                          |
| `CLOUDINARY_API_KEY`    | Cloudinary API Key                               |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret                            |

## 🚦 Full API Endpoints

### 🔐 Auth (`/api/auth`)

| Method | Route       | Description                  | Access  |
| ------ | ----------- | ---------------------------- | ------- |
| `POST` | `/register` | Register student/instructor  | Public  |
| `POST` | `/login`    | Login user & get JWT token   | Public  |
| `GET`  | `/me`       | Get currently logged in user | Private |
| `POST` | `/logout`   | Clear cookie / logout        | Public  |

### 📚 Courses (`/api/courses`)

| Method   | Route       | Description       | Access     | Notes                                                      |
| -------- | ----------- | ----------------- | ---------- | ---------------------------------------------------------- |
| `GET`    | `/`         | Get all courses   | Public     | Supports `?page=X&limit=Y&sort=rating/popular&search=text` |
| `GET`    | `/:id`      | Get single course | Public     | Populates instructor and lessons                           |
| `POST`   | `/`         | Create a course   | Instructor | Form-data required for `thumbnail` image upload            |
| `PUT`    | `/:id`      | Update course     | Instructor | Form-data supported for `thumbnail`                        |
| `DELETE` | `/:id`      | Delete course     | Instructor |                                                            |
| `POST`   | `/:id/rate` | Rate a course     | Student    | Must be enrolled to rate                                   |

### 📖 Lessons (`/api/courses/:courseId/lessons`)

| Method | Route              | Description              | Access     |
| ------ | ------------------ | ------------------------ | ---------- |
| `GET`  | `/`                | Get lessons for a course | Public     |
| `POST` | `/`                | Add lesson to a course   | Instructor |
| `GET`  | `/api/lessons/:id` | Get single lesson        | Public     |

### 🎓 Enrollments (`/api/enrollments`)

| Method  | Route           | Description               | Access  | Notes                                            |
| ------- | --------------- | ------------------------- | ------- | ------------------------------------------------ |
| `POST`  | `/`             | Enroll in a course        | Student |                                                  |
| `GET`   | `/my`           | Get student's enrollments | Student | Supports pagination                              |
| `PATCH` | `/:id/progress` | Update lesson progress    | Student | Updates `completed` status for a specific lesson |

### 💬 Comments (`/api/lessons/:lessonId/comments`)

| Method | Route | Description               | Access  |
| ------ | ----- | ------------------------- | ------- |
| `GET`  | `/`   | Get comments for a lesson | Public  |
| `POST` | `/`   | Add comment to a lesson   | Private |

## 🕹️ Installation & Running

**1. Install dependencies:**

```bash
npm install
```

**2. Configure Environment:**
Rename `.env.example` to `.env` and fill in your MongoDB and Cloudinary credentials.

**3. Seed Database:**

```bash
npm run seed -- -i
```

_(To destroy all data, run `npm run seed -- -d`)_

**4. Start local development server:**

```bash
npm run dev
```

## 🧪 Postman Testing

A complete Postman Collection is provided in `postman/EduFlow.postman_collection.json`.

1. Import the collection into your Postman app.
2. Ensure you have the environment variables set (or rely on default collection variables).
3. The collection handles auth tokens automatically via event scripts attached to the **Login** request. Hit `/login` first, and the generated JWT will be saved to your collection variables to be automatically used in endpoints requiring a `Bearer token`. For file uploads, ensure you attach a local image to the `thumbnail` key in the POST request body.

## 🔭 Future Improvements

- Implement password reset via email integration (Nodemailer/SendGrid)
- Add Video streaming chunking instead of direct URLs
- Implement Stripe payment gateway for paid courses
- Real-time chat integration relying on WebSockets (Socket.io)
- Caching frequent lookups via Redis
