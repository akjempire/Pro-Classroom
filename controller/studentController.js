const passport = require("passport");
const Student = require("../models/student");
const Assignment = require("../models/assingment");
const AssignmentSubmission = require("../models/assignmentSubmission");
const Classroom = require("../models/classroom");


module.exports.signupForm= async(req, res)=>{
    res.render("../views/pages/studentSignup.ejs");
};

module.exports.signup=async(req, res) => {
    try {
        let { username, email, password,} = req.body;
        const newstudent = new Student({ email, username});
        const registerStudent = await Student.register(newstudent, password);
        console.log(registerStudent);

        req.login(registerStudent, (err) => {
            if (err) {
                // req.flash("error", "Login failed after signup");
                return res.redirect("/signupStudent");
            }

            // req.flash("success", "Signup successful");
            return res.redirect("/student/studentDashboard");
        });

    } catch (error) {
        req.flash("error", error.message);
        return res.redirect("/signupStudent");
    }
};
module.exports.loginForm=async(req, res)=>{
    res.render("../views/pages/Studentlogin.ejs");
};

module.exports.isAuthenticated= passport.authenticate("student-local", {failureRedirect: "/loginStudent", failureFlash: true});

module.exports.login= async(req, res)=>{
    req.flash("success", "Welcome back to proclassroom")
    // let redirectUrl= res.locals.redirectUrl || "/lisitngs";
    res.redirect("/student/studentDashboard");
};

module.exports.logout=async(req,res, next)=>{
    req.logOut((err)=>{
        if(err)
        {
            return next(err);
        }

        req.flash("success", "succesfully loggedout");
        res.redirect("/");
    })
};
module.exports.joinClass= async (req, res) => {
    const { classCode } = req.body;
    const foundClassroom = await Classroom.findOne({ code: classCode }); 
    const studentId = req.user._id;
  
    if (!foundClassroom) {
      req.flash("error", "Invalid Class Code");
      return res.redirect("/student/studentDashboard");
    }
  
    const alreadyJoined = foundClassroom.students.find(s => s.equals(studentId));
  
    if (alreadyJoined) {
      req.flash("success", "Already joined this class");
      return res.redirect(`/student/class/${foundClassroom._id}`);
    }
  
    foundClassroom.students.push(studentId);
    await foundClassroom.save();

    const student = await Student.findById(studentId);
  student.joined_classrooms.push(foundClassroom._id);
  await student.save();

  
    req.flash("success", "Successfully joined the class");
    res.redirect(`/student/class/${foundClassroom._id}`);
  };

  module.exports.classDetails = async (req, res) => {
    const classId = req.params.id;
    const studentId = req.user._id;
  
    const classroom = await Classroom.findById(classId).populate("teacher");
    const assignments = await Assignment.find({ classId });
  
    // Fetch all submissions by the student in this class
    const submissions = await AssignmentSubmission.find({ classroom: classId, student: studentId });
  
    // Map of assignmentId -> submission
    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignment?.toString()] = sub;
    });
  
    res.render("student/classDetails", { classroom, assignments, submissionMap });
  };
  //JUST CHECKING IF NOT DELETE IT
  module.exports.submitAssignment = async (req, res) => {
    const { id } = req.params; // classId
    const { assignmentId } = req.query;
    const studentId = req.user._id;
  
    // First, save the new submission into the AssignmentSubmission collection
    const newSubmission = new AssignmentSubmission({
      classroom: id,
      assignment: assignmentId,
      student: studentId,
      fileUrl: {
        url: req.file.path, // Cloudinary URL (assuming req.file.path is the URL)
        filename: req.file.filename // File name of the uploaded file
      }
    });
  
    await newSubmission.save();
  
    // Now, update the Assignment document to store the submission under the student's ID
    await Assignment.updateOne(
      { _id: assignmentId }, // Find the assignment by its ID
      {
        $set: {
          // Dynamically access the submissions object using the studentId
          [`submissions.${studentId}`]: {
            fileUrl: { url: req.file.path, filename: req.file.filename },
            submittedAt: new Date() // Timestamp for when the assignment was submitted
          }
        }
      }
    );
  
    req.flash("success", "Assignment submitted successfully!");
    res.redirect(`/student/class/${id}`);
  };
  

  // module.exports.submitAssignment = async (req, res) => {
  //   const { id } = req.params; // classId
  //   const { assignmentId } = req.query;
  //   const studentId = req.user._id;
  
  //   const newSubmission = new AssignmentSubmission({
  //     classroom: id,
  //     assignment: assignmentId,
  //     student: studentId,
  //     fileUrl: {
  //       url: req.file.path,
  //       filename: req.file.filename
  //     }
  //   });
  
  //   await newSubmission.save();
  //   req.flash("success", "Assignment submitted successfully!");
  //   res.redirect(`/student/class/${id}`);
  // };

  module.exports.dashboard=async (req, res) => {
      const studentId = req.user._id;
      const student = req.user;
    
      const classes = await Classroom.find({ students: studentId }).populate("teacher");
    
      res.render("student/studentDashboard", { classes, student });
    };