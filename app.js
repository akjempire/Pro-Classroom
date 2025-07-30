const express = require("express");
const app = express();
require('dotenv').config();
const path = require("path");
const ExpressError= require("./utils/ExpressError");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session= require("express-session");
const mongoose = require("mongoose");
const flash= require("connect-flash");
const passport= require("passport");
const LocalStrategy = require("passport-local");
const Student = require("./models/student.js");
const Teacher= require("./models/teacher.js")


//importing routes
const teacherRoutes = require("./routes/teacherRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const teacherDashboard= require("./routes/teacherDashboardRoutes.js")


const MONGO_URL = "mongodb://127.0.0.1:27017/classroom";


main()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}
mongoose.set('strictPopulate', false);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


const sessionOption={
    secret:"Kuchtosecreth",
    resave: false,
    saveUninitialized: true,
    cookie:{
      expires: Date.now()+7*24*60*60*1000,
      maxAge:7*24*60*60*1000,
      httpOnly: true,
    }
  };


  app.use(session(sessionOption));
app.use(flash());


  app.use(passport.initialize());
app.use(passport.session());

passport.use("teacher-local", new LocalStrategy({ usernameField: 'username' }, Teacher.authenticate()));

// Student Strategy
passport.use("student-local", new LocalStrategy({ usernameField: 'username' }, Student.authenticate()));


passport.serializeUser((user, done) => {
  done(null, user._id); // Just save the ID
});

passport.deserializeUser(async (id, done) => {
  try {
    let user = await Teacher.findById(id);
    if (user) {
      user.role = "teacher"; // Add role manually
    } else {
      user = await Student.findById(id);
      if (user) user.role = "student"; // Add role manually
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});



  app.use((req, res, next)=> {
    res.locals.success= req.flash("success");
    res.locals.error= req.flash("error");
    res.locals.currUser=req.user;
    
    next();
  });
  
  
  
  app.get("/", (req, res) => {
    res.render("pages/Home.ejs");
  });

  app.use("/", studentRoutes);
  app.use("/", teacherRoutes);
  app.use("/teacher/class", teacherDashboard);

  

  // app.all("*", (req, res, next) => {
  //   next(new ExpressError(404, "Page not found"));
  // });
  app.use((req, res, next) => {
    const err = new Error("Page not found");
    err.statusCode = 404;
    next(err);
  });
  

  app.use((err, req, res, next) => {
    let { statusCode = 400, message = "Something went wrong" } = err;
    res.status(statusCode);
    res.render("error.ejs", { statusCode, message });
  });
  
  
app.listen(8000, () => {
    console.log("Server is listening on port 8000✅"); 
  });
  