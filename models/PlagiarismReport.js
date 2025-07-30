// models/PlagiarismReport.js
const mongoose = require('mongoose');

const plagiarismReportSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
  results: [{
    student1: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    student2: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    similarity: Number, // Percentage
    details: String,
    flagged: { type: Boolean, default: true }
  }],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PlagiarismReport', plagiarismReportSchema);