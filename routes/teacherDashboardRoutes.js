// routes/teacherDashboardRoutes.js
const express = require("express");
const router = express.Router();
const teacherDashboard = require("../controller/teacherDashboard");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const { storage } = require("../CloudConfig");
const multer = require("multer");
const upload = multer({ storage });

// submissions
router.get("/:classroomId/assignment/:assignmentId/submissions",
  isLoggedIn,
  wrapAsync(teacherDashboard.viewSubmission)
);

router.get("/:classroomId/student/:studentId/assignments",
  isLoggedIn,
  wrapAsync(teacherDashboard.viewStudentAssignments)
);

// class pages
router.get("/:id",
  isLoggedIn,
  wrapAsync(teacherDashboard.dashboard)
);

router.get("/:id/students",
  isLoggedIn,
  wrapAsync(teacherDashboard.studentDetails)
);

router.get("/:id/assignments",
  isLoggedIn,
  wrapAsync(teacherDashboard.assignments)
);

// upload assignment
router.get("/:id/upload-assignment",
  isLoggedIn,
  wrapAsync(teacherDashboard.uploadfrom)
);

router.post("/:id/upload-assignment",
  isLoggedIn,
  (req, res, next) => {
    upload.single("assignment[assignment]")(req, res, function (err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        req.flash("error", "File too large. Max size allowed is 5MB.");
        return res.redirect("back");
      } else if (err) return next(err);
      next();
    });
  },
  wrapAsync(teacherDashboard.upload)
);

// delete
router.delete("/:id/delete",
  isLoggedIn,
  wrapAsync(teacherDashboard.deleteClass)
);

// run plagiarism
router.post("/:classroomId/assignment/:assignmentId/run-plagiarism",
  isLoggedIn,
  wrapAsync(teacherDashboard.runPlagiarism)
);

// list reports (class-level)
router.get("/:id/plagiarism-reports",
  isLoggedIn,
  wrapAsync(teacherDashboard.plagiarismReportsList)
);

// view similarity
router.get("/:id/plagiarism/:reportId/similarity/:index",
  isLoggedIn,
  wrapAsync(teacherDashboard.viewSimilarity)
);

// serve extracted files
router.get("/extracted/:filename",
  isLoggedIn,
  wrapAsync(teacherDashboard.serveExtractedFile)
);

module.exports = router;
