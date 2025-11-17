const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const Teacher = require("../models/teacher");
const Classroom = require("../models/classroom");
const { isLoggedIn } = require("../middleware");
const teacherController = require("../controller/teacherController");

// ================================
// TEACHER AUTH ROUTES
// ================================
router.get("/signupTeacher", wrapAsync(teacherController.signupFrom));
router.post("/signupTeacher", wrapAsync(teacherController.singup));

router.get("/loginTeacher", wrapAsync(teacherController.loginForm));
router.post("/loginTeacher", teacherController.authenticate, wrapAsync(teacherController.login));

router.get("/logout", wrapAsync(teacherController.logout));

// ================================
// TEACHER DASHBOARD ROUTES
// ================================
router.get("/teacher/dashboard", isLoggedIn, wrapAsync(teacherController.dashboard));

// ================================
// CLASS CREATION ROUTES
// ================================
router.get("/teacher/create-class", isLoggedIn, wrapAsync(teacherController.createForm));
router.post("/teacher/create-class", isLoggedIn, wrapAsync(teacherController.createClass));

// ================================
// TEACHER MAIN CLASS LIST
// ================================
router.get("/teacher/teacherDashboard", isLoggedIn, async (req, res) => {
  const teacher = await Teacher.findById(req.user._id);
  const classes = await Classroom.find({ teacher: req.user._id });
  res.render("teacher/teacherDashboard", { teacher, classes });
});



module.exports = router;
