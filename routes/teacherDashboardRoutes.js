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
router.post("/:id/upload-assignment", isLoggedIn, (req, res, next) => {
  upload.single("assignment[assignment]")(req, res, function (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      req.flash("error", "File too large. Max size allowed is 5MB.");
      return res.redirect("back");
    } else if (err) {
      return next(err);
    }
    next();
  });
}, wrapAsync(teacherDashboard.upload));
// At bottom of teacherDashboard router
router.delete("/:id/delete", isLoggedIn, wrapAsync(teacherDashboard.deleteClass));





module.exports = router;
