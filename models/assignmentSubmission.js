const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
  fileUrl: {
           url:String,
           filename:String,
  },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }
,
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("AssignmentSubmission", submissionSchema);
