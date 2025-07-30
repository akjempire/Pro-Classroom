const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const router = express.Router(); 
const { storage } = require("../CloudConfig");
const multer = require("multer");
const upload = multer({ storage });
const studentController = require("../controller/studentController");
const {isLoggedIn} = require("../middleware");

// Auth routes
router.get("/signupStudent", wrapAsync(studentController.signupForm));
router.post("/signupStudent", wrapAsync(studentController.signup));
router.get("/loginStudent", wrapAsync(studentController.loginForm));
router.post("/loginStudent", studentController.isAuthenticated, wrapAsync(studentController.login));

// Dashboard
router.get("/student/studentDashboard",isLoggedIn, studentController.dashboard);

// Join Class
router.post("/student/join-class",isLoggedIn, wrapAsync(studentController.joinClass));

// Class Details
router.get("/student/class/:id",isLoggedIn, wrapAsync(studentController.classDetails));

// Submit Assignment
router.post("/student/class/:id/submit",isLoggedIn, upload.single("submission[file]"), wrapAsync(studentController.submitAssignment));

// Logout
router.get("/logout", wrapAsync(studentController.logout));

module.exports = router;
