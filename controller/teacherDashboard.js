
const Classroom = require("../models/classroom");
const Assignment =require("../models/assingment")
const AssignmentSubmission= require("../models/assignmentSubmission");
const assingment = require("../models/assingment");

module.exports.dashboard=async (req, res) => {
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
 module.exports.studentDetails=async (req, res) => {
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

    module.exports.assignments=async (req, res) => {
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

      module.exports.uploadfrom=async (req, res) => {
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

        module.exports.upload=async (req, res) => {
            let url=req.file.path;
            let filename=req.file.filename;
            let originalName=req.file.originalname;
            console.log(req.file);
            
           
            const { title, description, deadline } = req.body;
            const classroom = await Classroom.findById(req.params.id);
          
            const newAssignment = new Assignment({
              title,
              description,
              uploadedBy: req.user._id, // Current logged-in teacher
              classId: classroom._id,
              deadline
            });
            newAssignment.assignmentFile={url, filename, originalName};

          
            await newAssignment.save();
          
            // Add the assignment ID to the classroom model
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
                res.render("teacher/viewSubmissions", {
                    classroom,
                    submissions,
                    assignment
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
          
              // Fetch the classroom to ensure it exists
              const classroom = await Classroom.findById(classroomId).populate("assignments");
          
              if (!classroom) {
                req.flash("error", "Class not found");
                return res.redirect("/teacher/teacherDashboard");
              }
          
              // Fetch all submissions for this student in the specific classroom
              const submissions = await AssignmentSubmission.find({ classroom: classroomId, student: studentId })
                .populate("assignment")
                .populate("student")
                .sort({ submittedAt: -1 }); // Sorting by most recent submission first
          
              // Prepare data for rendering
              res.render("teacher/viewStudentAssignments", { 
                classroom, 
                submissions 
              });
            } catch (err) {
              console.error(err);
              req.flash("error", "Something went wrong");
              return res.redirect("/teacher/teacherDashboard");
            }
          };
  

module.exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // Delete all assignment submissions related to this class
    await AssignmentSubmission.deleteMany({ classroom: classId });

    // Delete all assignments in this class
    await Assignment.deleteMany({ classId });

    // Finally, delete the class itself
    await Classroom.findByIdAndDelete(classId);

    req.flash("success", "Class and all associated data deleted successfully.");
    res.redirect("/teacher/teacherDashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to delete the class.");
    res.redirect("/teacher/teacherDashboard");
  }
};

                