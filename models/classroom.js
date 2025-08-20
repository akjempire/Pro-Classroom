const { cloudinary } = require('../CloudConfig');
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

// Post middleware for classroom deletion
classroomSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    // Delete related assignments
    const assignments = await Assignment.find({ classId: doc._id });

    // Delete files from Cloudinary
    for (const assignment of assignments) {
      if (assignment.assignmentFile?.filename) {
        try {
          await cloudinary.uploader.destroy(assignment.assignmentFile.filename);
        } catch (err) {
          console.error(`Failed to delete file ${assignment.assignmentFile.filename}:`, err);
        }
      }
    }

    // Delete assignment documents
    await Assignment.deleteMany({ classId: doc._id });

    // Delete submissions
    await AssignmentSubmission.deleteMany({ classroom: doc._id });
  }
});





module.exports = mongoose.model("Classroom", classroomSchema);
