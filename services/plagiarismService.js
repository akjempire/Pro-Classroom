const natural = require('natural');
const AssignmentSubmission = require('../models/assignmentSubmission');
const PlagiarismReport = require('../models/PlagiarismReport');
const axios = require('axios');
const pdf = require('pdf-parse/lib/pdf-parse');
const mammoth = require('mammoth');
const stopword = require('stopword');

class PlagiarismService {
  constructor() {
    this.similarityThreshold = 0.0; 
  }

  async checkPlagiarismForAssignment(assignmentId, classroomId) {
    try {
      const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
        .populate('student', 'username email')
        .populate('assignment', 'title');

      if (!submissions.length) {
        return { assignment: assignmentId, classroom: classroomId, results: [], totalSubmissions: 0 };
      }

      // Fetch old report if exists
      let report = await PlagiarismReport.findOne({ assignment: assignmentId });
      const results = report ? [...report.results] : [];

      // Build a set of already compared pairs (avoid re-checking)
      const comparedPairs = new Set(
        results.map(r => {
          const pair = [r.student1.toString(), r.student2.toString()].sort().join('_');
          return pair;
        })
      );

      // Extract text once for all submissions
      const texts = await Promise.all(
        submissions.map(async sub => ({
          submissionId: sub._id,
          student: sub.student,
          text: this.preprocessText(await this.extractTextFromUrl(sub.fileUrl.url))
        }))
      );

      // Compare only new pairs
      for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
          const sub1 = submissions[i];
          const sub2 = submissions[j];

          const pairKey = [sub1.student._id.toString(), sub2.student._id.toString()].sort().join('_');

          // ✅ Skip if already compared before
          if (comparedPairs.has(pairKey)) continue;

          const text1 = texts.find(t => t.submissionId.equals(sub1._id)).text;
          const text2 = texts.find(t => t.submissionId.equals(sub2._id)).text;

          if (text1 && text2) {
            const similarity = this.mixedNgramSimilarity(text1, text2);

            if (similarity >= this.similarityThreshold) {
              results.push({
                student1: sub1.student._id,
                student2: sub2.student._id,
                similarity: Math.round(similarity * 100),
                details: `Similarity detected between ${sub1.student.username} and ${sub2.student.username}`,
                flagged: true
              });
            }

            // Mark this pair as compared (whether flagged or not)
            comparedPairs.add(pairKey);
          }
        }
      }

      // Save report (update or create new)
      if (report) {
        report.results = results;
        report.generatedAt = new Date();
        await report.save();
      } else {
        report = await PlagiarismReport.create({
          assignment: assignmentId,
          classroom: classroomId,
          results,
          generatedAt: new Date()
        });
      }

      return report;

    } catch (error) {
      console.error('Plagiarism check failed:', error);
      throw error;
    }
  }

  async extractTextFromUrl(url) {
    try {
      // ✅ Cloudinary file download (unchanged, still secure)
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      if (url.endsWith('.pdf')) {
        const data = await pdf(buffer);
        return data.text;
      } else if (url.endsWith('.docx')) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
      }
      return buffer.toString('utf-8');
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      return '';
    }
  }

  preprocessText(text) {
    text = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = text.split(/\s+/).filter(Boolean);
    return stopword.removeStopwords(words).join(' ');
  }

  mixedNgramSimilarity(text1, text2) {
    const sets1 = [
      new Set(this.createNgrams(text1, 1)),
      new Set(this.createNgrams(text1, 2)),
      new Set(this.createNgrams(text1, 3)),
    ];
    const sets2 = [
      new Set(this.createNgrams(text2, 1)),
      new Set(this.createNgrams(text2, 2)),
      new Set(this.createNgrams(text2, 3)),
    ];

    let totalSim = 0;
    for (let k = 0; k < 3; k++) {
      const inter = new Set([...sets1[k]].filter(x => sets2[k].has(x)));
      const union = new Set([...sets1[k], ...sets2[k]]);
      totalSim += union.size ? inter.size / union.size : 0;
    }
    return totalSim / 3;
  }

  createNgrams(text, n) {
    const words = text.split(/\s+/).filter(Boolean);
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
}

module.exports = new PlagiarismService();
