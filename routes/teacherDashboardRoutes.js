const express = require("express");
const router = express.Router();
const teacherDashboard = require("../controller/teacherDashboard");
const wrapAsync = require("../utils/wrapAsync");
const {isLoggedIn} = require("../middleware");

const { storage } = require("../CloudConfig");
const multer = require("multer");
const upload = multer({ storage });



// ✅ Define the specific route BEFORE the generic `/:id`
router.get("/:classroomId/assignment/:assignmentId/submissions",isLoggedIn, wrapAsync(teacherDashboard.viewSubmission));
router.get("/:classroomId/student/:studentId/assignments",isLoggedIn, wrapAsync(teacherDashboard.viewStudentAssignments));
// Other routes
router.get("/:id",isLoggedIn, wrapAsync(teacherDashboard.dashboard));
router.get("/:id/students",isLoggedIn, wrapAsync(teacherDashboard.studentDetails));
// In your teacherRoutes.js


router.get("/:id/assignments",isLoggedIn, wrapAsync(teacherDashboard.assignments));
router.get("/:id/upload-assignment",isLoggedIn, wrapAsync(teacherDashboard.uploadfrom));
router.post("/:id/upload-assignment",isLoggedIn, upload.single("assignment[assignment]"), wrapAsync(teacherDashboard.upload));



module.exports = router;
