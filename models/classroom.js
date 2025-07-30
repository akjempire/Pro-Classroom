const mongoose = require("mongoose");
const Assignment = require("./assingment");
const AssignmentSubmission = require("./assignmentSubmission");

const classroomSchema = new mongoose.Schema({
  name: String,
  subject: String,
  code: String,
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }]
});

// Cleanup middleware
classroomSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    // Delete related assignments
    await Assignment.deleteMany({ classId: doc._id });

    // Delete related submissions
    await AssignmentSubmission.deleteMany({ classroom: doc._id });

    // Optionally: clear from students' classes if you're storing that reference elsewhere
  }
});

module.exports = mongoose.model("Classroom", classroomSchema);
