// controller/teacherDashboard.js
const fs = require("fs");
const path = require("path");
const Classroom = require("../models/classroom");
const Assignment = require("../models/assingment");
const AssignmentSubmission = require("../models/assignmentSubmission");
const PlagiarismReport = require("../models/PlagiarismReport");
const PlagiarismService = require("../services/plagiarismService");

// ==================== class dashboard & standard views ====================
module.exports.dashboard = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id).populate("students");
    const assignments = await Assignment.find({ classId: req.params.id });
    const submissions = await AssignmentSubmission.find({ classroom: req.params.id }).populate("student");
    res.render("teacher/classDetails", { classroom, submissions, assignments });
  } catch (error) {
    req.flash("error", "Failed to load class details.");
    res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.studentDetails = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id).populate("students");
    if (!classroom) {
      req.flash("error", "Class not found");
      return res.redirect("/teacher/teacherDashboard");
    }
    res.render("teacher/studentDetails", { classroom });
  } catch (err) {
    req.flash("error", "Something went wrong");
    return res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.assignments = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    const assignments = await Assignment.find({ classId: req.params.id });
    res.render("teacher/assignmentList", { classroom, assignments });
  } catch (err) {
    console.error("Error loading assignments:", err);
    req.flash("error", "Failed to load assignments.");
    res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.uploadfrom = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      req.flash("error", "Class not found");
      return res.redirect("/teacher/teacherDashboard");
    }
    res.render("teacher/uploadAssignment", { classroom });
  } catch (err) {
    req.flash("error", "Something went wrong");
    return res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.upload = async (req, res) => {
  const url = req.file.path;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const { title, description, deadline } = req.body;
  const classroom = await Classroom.findById(req.params.id);

  const newAssignment = new Assignment({
    title,
    description,
    uploadedBy: req.user._id,
    classId: classroom._id,
    deadline
  });
  newAssignment.assignmentFile = { url, filename, originalName };
  await newAssignment.save();
  classroom.assignments.push(newAssignment._id);
  await classroom.save();

  req.flash("success", "Assignment uploaded successfully");
  res.redirect(`/teacher/class/${classroom._id}`);
};

module.exports.viewSubmission = async (req, res) => {
  try {
    const { classroomId, assignmentId } = req.params;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      req.flash("error", "Class not found");
      return res.redirect("/teacher/teacherDashboard");
    }
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      req.flash("error", "Assignment not found");
      return res.redirect("/teacher/teacherDashboard");
    }
    const submissions = await AssignmentSubmission.find({
      classroom: classroomId,
      assignment: assignmentId
    })
      .populate("student")
      .populate("assignment");

    // pass params explicitly for safe route building in view
    res.render("teacher/viewSubmissions", {
      classroom,
      submissions,
      assignment,
      classroomId,
      assignmentId
    });
  } catch (err) {
    console.error("Error in viewSubmission:", err);
    req.flash("error", "Something went wrong");
    return res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.viewStudentAssignments = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const classroom = await Classroom.findById(classroomId).populate("assignments");
    if (!classroom) {
      req.flash("error", "Class not found");
      return res.redirect("/teacher/teacherDashboard");
    }
    const submissions = await AssignmentSubmission.find({
      classroom: classroomId,
      student: studentId
    })
      .populate("assignment")
      .populate("student")
      .sort({ submittedAt: -1 });

    res.render("teacher/viewStudentAssignments", { classroom, submissions });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    return res.redirect("/teacher/teacherDashboard");
  }
};

module.exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const deletedClass = await Classroom.findOneAndDelete({
      _id: classId,
      teacher: req.user._id
    });

    if (!deletedClass) {
      req.flash("error", "Class not found or unauthorized.");
      return res.redirect("/teacher/teacherDashboard");
    }

    req.flash("success", "Class successfully deleted.");
    res.redirect("/teacher/teacherDashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to delete the class.");
    res.redirect("/teacher/teacherDashboard");
  }
};

// ==================== Plagiarism features ====================
module.exports.runPlagiarism = async (req, res) => {
  try {
    const { assignmentId, classroomId } = req.params;
    await PlagiarismService.checkPlagiarismForAssignment(assignmentId, classroomId);
    req.flash("success", "Plagiarism check completed successfully.");
    return res.redirect(`/teacher/class/${classroomId}/plagiarism-reports`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to run plagiarism check.");
    return res.redirect("back");
  }
};

module.exports.plagiarismReportsList = async (req, res) => {
  try {
    const reports = await PlagiarismReport.find({ classroom: req.params.id })
      .populate("assignment")
      .populate("results.student1", "username email")
      .populate("results.student2", "username email")
      .sort({ generatedAt: -1 });

    res.render("teacher/plagiarismReports", { reports });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load reports.");
    res.redirect("back");
  }
};

module.exports.viewSimilarity = async (req, res) => {
  try {
    const { reportId, index } = req.params;

    const report = await PlagiarismReport.findById(reportId)
      .populate({
        path: 'results.student1',
        select: 'username email'
      })
      .populate({
        path: 'results.student2',
        select: 'username email'
      });

    if (!report) {
      req.flash("error", "Report not found");
      return res.redirect("back");
    }

    const idx = Number(index);
    if (isNaN(idx) || idx < 0 || idx >= report.results.length) {
      req.flash("error", "Invalid similarity index");
      return res.redirect("back");
    }

    const pair = report.results[idx];

    // convenience for view: matched sentences and extracted file names
    const matchedContent = pair.matchedContent || [];
    const download1 = pair.file1 ? path.basename(pair.file1) : null;
    const download2 = pair.file2 ? path.basename(pair.file2) : null;

    res.render("teacher/viewSimilarity", {
      pair,
      report,
      matchedContent,
      download1,
      download2
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load similarity details.");
    res.redirect("back");
  }
};

module.exports.serveExtractedFile = async (req, res) => {
  const { filename } = req.params;
  const extractFolder = path.join(__dirname, "..", "extractedTexts");
  const safePath = path.join(extractFolder, path.basename(filename));
  return res.sendFile(safePath);
};
