// models/PlagiarismReport.js
const mongoose = require('mongoose');

const matchedSentenceSchema = new mongoose.Schema({
  sentence1: String,
  sentence2: String,
  similarity: Number // percentage
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student1: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  student2: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  similarity: Number, // Percentage
  details: String,
  flagged: { type: Boolean, default: true },

  // sentences that matched (stored as array of pairs)
  matchedContent: {
    type: [matchedSentenceSchema],
    default: []
  },

  // local file paths to saved extracts
  file1: String,
  file2: String
}, { _id: false });

const plagiarismReportSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
  results: [resultSchema],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PlagiarismReport', plagiarismReportSchema);
