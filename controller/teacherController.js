const passport = require("passport");
const Teacher = require("../models/teacher");
const Classroom = require("../models/classroom");


module.exports.signupFrom=async(req, res)=>{
    res.render("../views/teacher/teacherSignup.ejs");
};

module.exports.singup= async(req, res) => {
    try {
        let { username, email, password } = req.body;
        const newTeacher = new Teacher({ email, username });
        const registerTeacher = await Teacher.register(newTeacher, password);
        

        req.login(registerTeacher, (err) => {
            if (err) {
                req.flash("error", "Login failed after signup");
                return res.redirect("/signupTeacher");
            }

            req.flash("success", "Signup successful");
            return res.redirect("/loginTeacher");
        });

    } catch (error) {
        req.flash("error", error.message);
        return res.redirect("/signupTeacher");
    }
};

module.exports.loginForm=  async(req, res)=>{
    res.render("../views/teacher/teacherLogin.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to ProClassroom");
    res.redirect("/teacher/teacherDashboard");
};
module.exports.authenticate = passport.authenticate("teacher-local", {
    failureRedirect: "/loginTeacher",
    failureFlash: true
});

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

module.exports.dashboard=async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.user._id); // Fetch the teacher's profile
      const classes = await Classroom.find({ teacher: req.user._id }); // Fetch all classes created by the teacher
      res.render("teacher/teacherDashboard", { teacher, classes });
    } catch (error) {
      req.flash("error", "Failed to load dashboard.");
      res.redirect("/");
    }
  };

  module.exports.createForm=async(req, res) => {
    res.render("teacher/createClass"); // Render the form for creating class
  };

  module.exports.createClass= async(req, res) => {
    const { name, subject } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate a simple invite code
    const newClass = new Classroom({
      name,
      subject,
      code: inviteCode,
      teacher: req.user._id
    });
  
    try {
      await newClass.save();
      // 2. Add the class ID to the teacher’s document
      await Teacher.findByIdAndUpdate(req.user._id, {
        $push: { created_classrooms: newClass._id }
      });
      req.flash("success", "Class created successfully!");
      res.redirect("/teacher/teacherDashboard"); // Redirect back to dashboard
    } catch (error) {
      req.flash("error", "Failed to create class.");
      res.redirect("/teacher/create-class");
    }
  };
  // controller/teacherController.js
