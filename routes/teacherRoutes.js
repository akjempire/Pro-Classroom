const express = require("express");
const router = express.Router(); 
const wrapAsync= require("../utils/wrapAsync")
const Teacher = require("../models/teacher");
const Classroom = require("../models/classroom");
const {isLoggedIn} = require("../middleware");
const PlagiarismService = require('../services/plagiarismService');
const Assignment = require('../models/assingment');
const PlagiarismReport = require('../models/PlagiarismReport');

// const { saveRedirectUrl } = require("../middleware");
const teacherController= require("../controller/teacherController");

router.get("/signupTeacher", wrapAsync(teacherController.signupFrom));

router.post("/signupTeacher", wrapAsync(teacherController.singup));

router.get("/loginTeacher",wrapAsync(teacherController.loginForm));

router.post("/loginTeacher", teacherController.authenticate, wrapAsync(teacherController.login));

router.get("/logout", wrapAsync(teacherController.logout));

router.get("/teacher/dashboard", isLoggedIn, wrapAsync(teacherController.dashboard));

  // In your teacherRoutes.js


router.get("/teacher/create-class",isLoggedIn, wrapAsync( teacherController.createForm));

router.post("/teacher/create-class",isLoggedIn, wrapAsync( teacherController.createClass));
// router.post("/teacher/assignment/:assignmentId/manual-check", teacherController.manualCheck);
// router.post("/teacher/assignment/:assignmentId/report", teacherController.getPlagiarismReport);
// router.get("/teacher/assignment/:assignmentId/report", teacherController.getPlagiarismReport);


router.get("/teacher/teacherDashboard", isLoggedIn,async (req, res) => {
  const teacher = await Teacher.findById(req.user._id);
  const classes = await Classroom.find({ teacher: req.user._id });
  res.render("teacher/teacherDashboard", { teacher, classes });
});
router.post('/teacher/assignment/:id/manual-check', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select('-classroom');
    if (!assignment) {
      return res.status(404).render('error', { message: 'Assignment not found' });
    }

    // Service handles checking + saving
    const report = await PlagiarismService.checkPlagiarismForAssignment(
      assignment._id,
      assignment.classId
    );

    // Just redirect to results page
    res.redirect(`/teacher/assignment/${assignment._id}/results`);

  } catch (error) {
    console.error('PLAGIARISM_CHECK_ERROR:', error);
    res.status(400).render('error', { 
      message: 'Check failed',
      details: error.message 
    });
  }
});

router.get('/teacher/assignment/:id/results', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      req.flash('error', 'Assignment not found');
      return res.redirect('back');
    }

    // Always get latest plagiarism report
    const report = await PlagiarismReport.findOne({ assignment: assignment._id })
      .sort({ generatedAt: -1 })
      .populate('results.student1 results.student2');

    let classroom = null;
    if (assignment.classId) {
      classroom = await Classroom.findById(assignment.classId).catch(() => null);
    }

    res.render('teacher/assignment-results', {
      assignment,
      classroom,
      report
    });

  } catch (error) {
    console.error('Results error:', error);
    req.flash('error', 'Error loading results');
    res.redirect('back');
  }
});

// router.post('/teacher/assignment/:id/manual-check', async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id)
//       .select('-classroom'); // Explicit exclusion
    
//     if (!assignment) return res.status(404).render('error', { message: 'Assignment not found' });

//     const report = await PlagiarismService.checkPlagiarismForAssignment(
//       assignment._id,
//       assignment.classId // Pass but don't populate
//     );
    
//     await PlagiarismReport.create({
//       assignment: assignment._id,
//       results: report.comparisons
//     });

//     res.redirect(`/teacher/assignment/${assignment._id}/results`);
//   } catch (error) {
//     console.error('PLAGIARISM_CHECK_ERROR:', error);
//     res.status(400).render('error', { 
//       message: 'Check failed',
//       details: error.message 
//     });
//   }
// });
// router.get('/teacher/assignment/:id/results', async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
//     if (!assignment) {
//       req.flash('error', 'Assignment not found');
//       return res.redirect('back');
//     }

//     const report = await PlagiarismReport.findOne({ assignment: req.params.id })
//       .sort({ generatedAt: -1 })
//       .populate('results.student1 results.student2');

//     // Safely get classroom if it exists
//     let classroom = null;
//     if (assignment.classId) {
//       classroom = await Classroom.findById(assignment.classId).catch(() => null);
//     }

//     res.render('teacher/assignment-results', {
//       assignment,
//       classroom, // Now properly passed
//       report
//     });

//   } catch (error) {
//     console.error('Results error:', error);
//     req.flash('error', 'Error loading results');
//     res.redirect('back');
//   }
// });

module.exports = router;